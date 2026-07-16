using System.Buffers;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ApiTestSpark;

/// <summary>
/// Extension methods to register the API Test Spark in a .NET Minimal API application.
/// </summary>
public static class ApiTestSparkExtensions
{
    private const string UserNameToken = "{user-name}";
    private const string UserEmailToken = "{user-email}";
    private const string UserIdToken = "{user-id}";
    private const string SessionGuidToken = "{session-guid}";
    private const string RequestGuidToken = "{request-guid}";
    private const string SessionGuidHeader = "X-ApiTestSpark-SessionGuid";
    private const string RequestGuidHeader = "X-ApiTestSpark-RequestGuid";
    private const string MountPath = "/api-test-spark";
    private const string ConfigPath = "/api-test-spark/config";
    private const string RemoteSpecPath = "/api-test-spark/remote-spec";
    private const string RemoteCallPath = "/api-test-spark/remote-call";
    private const string ResourcePrefix = "ApiTestSpark.build.";
    private const string BuildDateMetadataKey = "ApiTestSparkBuildDateUtc";
    private const string CorsPolicy = "ApiTestSpark.CorsPolicy";
    private const int MaxRemoteSpecBytes = 2_000_000;

    // First harness-owned HTTP resource — shared static instance avoids socket exhaustion.
    // Configured with a 10-second timeout to prevent hanging endpoint discovery.
    private static readonly HttpClient SharedHttpClient = new(new SocketsHttpHandler
    {
        AllowAutoRedirect = false,
        PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    })
    {
        Timeout = TimeSpan.FromSeconds(10),
    };

    // Server-side OAuth access token cache, keyed by RemoteApiProfile.Id. Tokens (and the
    // client secret used to acquire them) never leave the server — see RemoteApiProfile.OAuth.
    private static readonly ConcurrentDictionary<string, (string AccessToken, DateTimeOffset ExpiresAt)> OAuthTokenCache = new();
    private static readonly TimeSpan OAuthTokenExpiryBuffer = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Returns a valid cached OAuth access token for the profile, acquiring/refreshing one via
    /// the client_credentials grant if needed. Returns null if OAuth is not configured for this
    /// profile or if acquisition fails (failure is logged, never thrown, so proxied calls can
    /// still proceed without the header rather than hard-failing the whole request).
    /// </summary>
    private static async Task<string?> GetOAuthAccessTokenAsync(
        RemoteApiProfile profile,
        HttpClient httpClient,
        ILogger? logger,
        CancellationToken cancellationToken)
    {
        var oauth = profile.OAuth;
        if (oauth is null ||
            string.IsNullOrWhiteSpace(oauth.TokenEndpointUrl) ||
            string.IsNullOrWhiteSpace(oauth.ClientId) ||
            string.IsNullOrWhiteSpace(oauth.ClientSecret))
        {
            return null;
        }

        if (OAuthTokenCache.TryGetValue(profile.Id, out var cached) &&
            DateTimeOffset.UtcNow < cached.ExpiresAt - OAuthTokenExpiryBuffer)
        {
            return cached.AccessToken;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, oauth.TokenEndpointUrl)
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials",
                    ["client_id"] = oauth.ClientId,
                    ["client_secret"] = oauth.ClientSecret,
                }),
            };

            using var response = await httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                logger?.LogWarning("OAuth token acquisition failed for remote profile {ProfileId}: HTTP {StatusCode}", profile.Id, (int)response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken).ConfigureAwait(false);
            var root = doc.RootElement;
            if (!root.TryGetProperty("access_token", out var tokenProp) || tokenProp.ValueKind != JsonValueKind.String)
            {
                logger?.LogWarning("OAuth token response for remote profile {ProfileId} did not contain access_token.", profile.Id);
                return null;
            }

            var accessToken = tokenProp.GetString()!;
            var expiresIn = root.TryGetProperty("expires_in", out var expiresProp) && expiresProp.TryGetInt64(out var seconds)
                ? seconds
                : 3600; // Reasonable default when the provider omits expires_in.
            var expiresAt = DateTimeOffset.UtcNow.AddSeconds(expiresIn);

            OAuthTokenCache[profile.Id] = (accessToken, expiresAt);
            return accessToken;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Network error/timeout — credentials MUST NOT appear in the log message.
            logger?.LogWarning(ex, "OAuth token acquisition failed for remote profile {ProfileId}.", profile.Id);
            return null;
        }
    }

    /// <summary>
    /// Registers the API Test Spark SPA at <c>/api-test-spark/</c>.
    /// </summary>
    /// <remarks>
    /// <para>Prerequisites:</para>
    /// <list type="bullet">
    ///   <item>Call <c>app.UseForwardedHeaders()</c> BEFORE this method when running behind a
    ///   reverse proxy so <c>baseUrl</c> in the config response reflects the public URL.</item>
    ///   <item>The harness is always served at <c>/api-test-spark/</c>. Custom mount paths
    ///   are not supported in this release.</item>
    /// </list>
    /// </remarks>
    public static WebApplication MapApiTestSpark(
        this WebApplication app,
        Action<ApiTestSparkOptions>? configure = null)
    {
        var options = new ApiTestSparkOptions();
        configure?.Invoke(options);
        var remoteProfiles = BuildRemoteProfiles(options);

        var logger = app.Services.GetRequiredService<ILogger<ApiTestSparkMiddleware>>();

        // (a) Verify embedded resources exist — catch silent 404 trap at startup
        var assembly = typeof(ApiTestSparkExtensions).Assembly;
        var resourceNames = assembly.GetManifestResourceNames();
        if (!resourceNames.Any(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal)))
        {
            throw new InvalidOperationException(
                $"ApiTestSpark: No embedded resources found with prefix '{ResourcePrefix}'. " +
                $"Run pack.ps1 to build the React SPA before packing. Found resources: {string.Join(", ", resourceNames.Take(5))}");
        }

        // (b) Warn if sensitive headers are registered in DefaultHeaders
        var sensitiveKeys = new[] { "authorization", "cookie", "x-api-key", "x-auth-token" };
        foreach (var key in options.DefaultHeaders.Keys)
        {
            if (sensitiveKeys.Contains(key.ToLowerInvariant()))
            {
                logger.LogWarning(
                    "ApiTestSpark: DefaultHeaders contains '{Key}' which may expose " +
                    "sensitive information via the publicly accessible config endpoint. " +
                    "Consider removing credentials from DefaultHeaders.", key);
            }
        }

        // (c) Environment gating
        if (options.Environments.Length > 0)
        {
            var env = app.Services.GetRequiredService<IHostEnvironment>();
            if (!options.Environments.Contains(env.EnvironmentName, StringComparer.OrdinalIgnoreCase))
            {
                logger.LogInformation(
                    "ApiTestSpark: Harness not registered — environment '{Env}' is not in allowed list [{Allowed}].",
                    env.EnvironmentName, string.Join(", ", options.Environments));
                return app;
            }
        }

        // (d) Validate OpenApiUrl format if provided
        if (options.OpenApiUrl is not null)
        {
            if (!Uri.TryCreate(options.OpenApiUrl, UriKind.RelativeOrAbsolute, out _))
            {
                logger.LogWarning(
                    "ApiTestSpark: OpenApiUrl '{Url}' is not a valid URI. " +
                    "Endpoint autodiscovery may fail.", options.OpenApiUrl);
            }
        }

        // Optional auth gate for all harness routes (assets + API endpoints).
        // Host app controls whether anonymous access is allowed via options.
        app.Use(async (ctx, next) =>
        {
            if (!options.RequireAuthenticatedUser ||
                !ctx.Request.Path.StartsWithSegments(MountPath))
            {
                await next(ctx);
                return;
            }

            if (ctx.User.Identity?.IsAuthenticated == true)
            {
                await next(ctx);
                return;
            }

            if (ctx.Request.Path.StartsWithSegments(ConfigPath) ||
                ctx.Request.Path.StartsWithSegments(RemoteSpecPath) ||
                ctx.Request.Path.StartsWithSegments(RemoteCallPath))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await ctx.Response.WriteAsJsonAsync(new { error = "Authentication required." }).ConfigureAwait(false);
                return;
            }

            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        });

        // Register embedded static files under /api-test-spark
        var fileProvider = new EmbeddedFileProvider(assembly, "ApiTestSpark.build");
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = fileProvider,
            RequestPath = MountPath,
            OnPrepareResponse = ctx =>
            {
                if (string.Equals(
                    Path.GetExtension(ctx.File.Name),
                    ".css",
                    StringComparison.OrdinalIgnoreCase))
                {
                    ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                    ctx.Context.Response.Headers["Pragma"] = "no-cache";
                    ctx.Context.Response.Headers["Expires"] = "0";
                }
            },
        });

        // Compute once — baked into every config response so the SPA can display version/build date
        var harnessVersion = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion
            ?.Split('+')[0]   // strip git hash suffix if present
            ?? assembly.GetName().Version?.ToString()
            ?? "unknown";
        var harnessBuiltAt = ResolveHarnessBuildTimestampUtc(assembly);

        // Config endpoint — set CORS headers manually (avoids requiring AddCors() from host)
        app.MapGet(ConfigPath, (HttpContext ctx) =>
        {
            logger.LogInformation(
                "ApiTestSpark: Config requested from {RemoteIp}",
                ctx.Connection.RemoteIpAddress);

            // Apply CORS: allow listed origins or same-origin only
            var origin = ctx.Request.Headers["Origin"].ToString();
            if (!string.IsNullOrEmpty(origin))
            {
                var allowed = options.CorsOrigins.Length > 0
                    ? options.CorsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)
                    : Uri.TryCreate(origin, UriKind.Absolute, out var originUri) &&
                      originUri.Host == ctx.Request.Host.Host;

                if (allowed)
                {
                    ctx.Response.Headers["Access-Control-Allow-Origin"] = origin;
                    ctx.Response.Headers.Append("Vary", "Origin");
                }
            }

            var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
            var userName = ResolveUserName(ctx.User);
            var userEmail = ResolveUserEmail(ctx.User);
            var userId = ResolveUserId(ctx.User);
            var resolvedDefaultHeaders = ResolveHeaderTokens(options.DefaultHeaders, ctx.User);
            var resolvedRemoteDefaultHeaders = ResolveHeaderTokens(options.RemoteDefaultHeaders, ctx.User);
            var resolvedRemoteProfiles = remoteProfiles
                .Select(profile => ResolveHeaderTokens(profile, ctx.User))
                .ToList();

            var response = new
            {
                baseUrl,
                openApiUrl = options.OpenApiUrl,
                authScheme = options.AuthScheme,
                defaultHeaders = resolvedDefaultHeaders,
                enableDemoIntegrations = options.EnableDemoIntegrations,
                userName,
                userEmail,
                userId,
                remoteDefaultHeaders = resolvedRemoteDefaultHeaders,
                remoteBaseUrl = options.RemoteBaseUrl,
                remoteOpenApiUrl = options.RemoteOpenApiUrl,
                remoteOpenApiApiKeyHeader = options.RemoteOpenApiApiKeyHeader,
                remoteOpenApiApiKeyValue = (string?)null,
                remoteOpenApiBearerToken = (string?)null,
                remoteApiProfiles = resolvedRemoteProfiles.Select(profile => ToConfigProfile(profile, options.EnableRemoteCallProxy)),
                harnessVersion,
                harnessBuiltAt,
            };

            logger.LogDebug(
                "ApiTestSpark: Config served — openApiUrl={OpenApiUrl} authScheme={AuthScheme}",
                options.OpenApiUrl, options.AuthScheme);

            return Results.Json(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        });

        // Remote spec proxy — fetch remote OpenAPI document server-side to avoid CORS
        app.MapGet(RemoteSpecPath, async (HttpContext ctx) =>
        {
            var profileId = ctx.Request.Query["profileId"].ToString();
            var profile = ResolveRemoteProfile(remoteProfiles, profileId);

            if (profile is null)
            {
                var message = remoteProfiles.Count == 0
                    ? "No server remote API profiles are configured."
                    : "Unknown remote API profile.";
                return Results.Json(new { error = message }, statusCode: remoteProfiles.Count == 0 ? 400 : 404);
            }

            if (string.IsNullOrWhiteSpace(profile.RemoteOpenApiUrl))
                return Results.Json(new { error = "RemoteOpenApiUrl is not configured." }, statusCode: 400);

            // SSRF guard: reject non-HTTP schemes (file://, ldap://, etc.) before any outbound call
            if (!profile.RemoteOpenApiUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !profile.RemoteOpenApiUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return Results.Json(new { error = "RemoteOpenApiUrl must use http or https scheme." }, statusCode: 400);
            }

            using var request = new HttpRequestMessage(HttpMethod.Get, profile.RemoteOpenApiUrl);

            if (!string.IsNullOrWhiteSpace(profile.RemoteOpenApiApiKeyHeader) &&
                !string.IsNullOrWhiteSpace(profile.RemoteOpenApiApiKeyValue))
            {
                request.Headers.TryAddWithoutValidation(profile.RemoteOpenApiApiKeyHeader, profile.RemoteOpenApiApiKeyValue);
            }

            if (!string.IsNullOrWhiteSpace(profile.RemoteOpenApiBearerToken))
            {
                request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {profile.RemoteOpenApiBearerToken}");
            }

            var httpClient = options.TestHttpClient ?? SharedHttpClient;

            if (profile.OAuth is not null)
            {
                var oauthToken = await GetOAuthAccessTokenAsync(profile, httpClient, logger, ctx.RequestAborted).ConfigureAwait(false);
                if (oauthToken is not null)
                {
                    request.Headers.Remove("Authorization");
                    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {oauthToken}");
                }
            }

            HttpResponseMessage remoteResponse;
            try
            {
                remoteResponse = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted).ConfigureAwait(false);
            }
            catch
            {
                // Network error or timeout — credentials MUST NOT appear in the message
                return Results.Json(new { error = "Failed to fetch remote OpenAPI document." }, statusCode: 502);
            }

            using (remoteResponse)
            {
                if (IsRedirect(remoteResponse.StatusCode))
                    return Results.Json(new { error = "Remote OpenAPI redirects are not followed." }, statusCode: 502);

                if (!remoteResponse.IsSuccessStatusCode)
                    return Results.Json(new { error = "Failed to fetch remote OpenAPI document." }, statusCode: 502);

                var contentType = remoteResponse.Content.Headers.ContentType?.MediaType ?? string.Empty;
                if (!contentType.StartsWith("application/json", StringComparison.OrdinalIgnoreCase) &&
                    !contentType.StartsWith("application/vnd.oai.openapi+json", StringComparison.OrdinalIgnoreCase))
                {
                    return Results.Json(new { error = "Remote server returned non-JSON content." }, statusCode: 502);
                }

                if (remoteResponse.Content.Headers.ContentLength > MaxRemoteSpecBytes)
                    return Results.Json(new { error = "Remote OpenAPI document is too large." }, statusCode: 502);

                var body = await ReadContentWithLimit(remoteResponse.Content, ctx.RequestAborted);
                if (body is null)
                    return Results.Json(new { error = "Remote OpenAPI document is too large." }, statusCode: 502);

                return Results.Content(body, "application/json");
            }
        });

        // Remote call proxy — server-configured profiles avoid browser CORS restrictions.
        app.MapMethods(RemoteCallPath, ["GET", "POST", "PUT", "PATCH", "DELETE"], async (HttpContext ctx) =>
        {
            if (!options.EnableRemoteCallProxy)
                return Results.Json(new { error = "Remote call proxy is not enabled." }, statusCode: 403);

            var profileId = ctx.Request.Query["profileId"].ToString();
            var profile = ResolveRemoteProfile(remoteProfiles, profileId);
            if (profile is null)
            {
                var message = remoteProfiles.Count == 0
                    ? "No server remote API profiles are configured."
                    : "Unknown remote API profile.";
                return Results.Json(new { error = message }, statusCode: remoteProfiles.Count == 0 ? 400 : 404);
            }

            var path = ctx.Request.Query["path"].ToString();
            if (!TryResolveRemoteCallUri(profile, path, out var targetUri))
                return Results.Json(new { error = "Remote call path is invalid." }, statusCode: 400);

            using var request = new HttpRequestMessage(new HttpMethod(ctx.Request.Method), targetUri);
            if (ctx.Request.ContentLength is > 0)
            {
                request.Content = new StreamContent(ctx.Request.Body);
                if (!string.IsNullOrWhiteSpace(ctx.Request.ContentType))
                    request.Content.Headers.TryAddWithoutValidation("Content-Type", ctx.Request.ContentType);
            }

            CopyForwardableRequestHeaders(ctx.Request, request);
            ApplyRemoteProfileHeaders(request, ResolveProxyHeaderTokens(profile.RemoteDefaultHeaders, ctx.User, ctx));

            if (!string.IsNullOrWhiteSpace(profile.RemoteOpenApiApiKeyHeader) &&
                !string.IsNullOrWhiteSpace(profile.RemoteOpenApiApiKeyValue))
            {
                request.Headers.Remove(profile.RemoteOpenApiApiKeyHeader);
                request.Headers.TryAddWithoutValidation(profile.RemoteOpenApiApiKeyHeader, profile.RemoteOpenApiApiKeyValue);
            }

            if (!string.IsNullOrWhiteSpace(profile.RemoteOpenApiBearerToken))
            {
                request.Headers.Remove("Authorization");
                request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {profile.RemoteOpenApiBearerToken}");
            }

            var httpClient = options.TestHttpClient ?? SharedHttpClient;

            if (profile.OAuth is not null)
            {
                var oauthToken = await GetOAuthAccessTokenAsync(profile, httpClient, logger, ctx.RequestAborted).ConfigureAwait(false);
                if (oauthToken is not null)
                {
                    request.Headers.Remove("Authorization");
                    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {oauthToken}");
                }
            }

            HttpResponseMessage remoteResponse;
            try
            {
                remoteResponse = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted).ConfigureAwait(false);
            }
            catch
            {
                return Results.Json(new { error = "Failed to call remote API." }, statusCode: 502);
            }

            using (remoteResponse)
            {
                if (IsRedirect(remoteResponse.StatusCode))
                    return Results.Json(new { error = "Remote API redirects are not followed." }, statusCode: 502);

                ctx.Response.StatusCode = (int)remoteResponse.StatusCode;
                CopyForwardableResponseHeaders(remoteResponse, ctx.Response);
                await remoteResponse.Content.CopyToAsync(ctx.Response.Body, ctx.RequestAborted).ConfigureAwait(false);
            }

            return Results.Empty;
        });

        // SPA middleware — serve index.html fallback and set security headers
        app.Use(async (ctx, next) =>
        {
            if (!ctx.Request.Path.StartsWithSegments(MountPath))
            {
                await next(ctx);
                return;
            }

            // Redirect /api-test-spark → /api-test-spark/ so React Router basename matches.
            // React Router with basename="/api-test-spark/" requires the URL to start with
            // the basename including the trailing slash; without it the router renders nothing.
            if (ctx.Request.Path.Value == MountPath)
            {
                ctx.Response.Redirect(MountPath + "/" + ctx.Request.QueryString, permanent: false);
                return;
            }

            var subPath = ctx.Request.Path.Value ?? string.Empty;
            var hasExtension = Path.HasExtension(subPath);

            if (hasExtension)
            {
                // Let static file middleware handle — if not found, return 404 (not index.html)
                await next(ctx);
                return;
            }

            // Pass through to MapGet routes before SPA fallback
            if (ctx.Request.Path.StartsWithSegments(ConfigPath) ||
                ctx.Request.Path.StartsWithSegments(RemoteSpecPath) ||
                ctx.Request.Path.StartsWithSegments(RemoteCallPath))
            {
                await next(ctx);
                return;
            }

            // Extensionless path → serve index.html (SPA fallback)
            if (options.EnableVerboseLogging)
            {
                var spaLogger = app.Services.GetRequiredService<ILogger<ApiTestSparkMiddleware>>();
                spaLogger.LogDebug(
                    "ApiTestSpark: SPA fallback {RequestPath} -> index.html",
                    ctx.Request.Path);
            }

            ctx.Response.Headers["Cache-Control"] = "no-cache";

            // In Development, allow localhost WebSocket/HTTP connections so ASP.NET Core
            // Browser Link and hot-reload can connect without being blocked by CSP.
            var hostEnv = app.Services.GetRequiredService<IHostEnvironment>();
            var devConnectSrc = hostEnv.IsDevelopment()
                ? " ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*"
                : string.Empty;

            // Allow configured remote base URLs in CSP connect-src.
            var remoteConnectSrc = string.Concat(remoteProfiles
                .Select(p => p.RemoteBaseUrl)
                .Append(options.RemoteBaseUrl)
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(url => $" {url!.TrimEnd('/')}"));

            ctx.Response.Headers["Content-Security-Policy"] =
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; " +
                "connect-src 'self' https: http: https://*.applicationinsights.azure.com https://*.monitor.azure.com " +
                $"https://v2.jokeapi.dev https://jsonplaceholder.typicode.com{remoteConnectSrc}{devConnectSrc}";

            var indexFile = fileProvider.GetFileInfo("index.html");
            if (!indexFile.Exists)
            {
                ctx.Response.StatusCode = 404;
                return;
            }

            ctx.Response.ContentType = "text/html; charset=utf-8";
            using var stream = indexFile.CreateReadStream();
            await stream.CopyToAsync(ctx.Response.Body).ConfigureAwait(false);
        });

        logger.LogInformation(
            "ApiTestSpark: Mounted at {MountPath}/ — OpenAPI: {OpenApiUrl}",
            MountPath, options.OpenApiUrl ?? "(none)");

        return app;
    }

    private static List<RemoteApiProfile> BuildRemoteProfiles(ApiTestSparkOptions options)
    {
        var configured = options.RemoteApiProfiles
            .Where(IsRemoteProfileConfigured)
            .Select(NormalizeProfile)
            .ToList();

        if (configured.Count > 0)
            return configured;

        if (!HasLegacyRemote(options))
            return [];

        return
        [
            new RemoteApiProfile
            {
                Id = "legacy-remote-api",
                Name = "Remote API",
                Description = "Configured from legacy single-remote ApiTestSparkOptions.",
                RemoteBaseUrl = options.RemoteBaseUrl,
                RemoteOpenApiUrl = options.RemoteOpenApiUrl,
                RemoteOpenApiApiKeyHeader = options.RemoteOpenApiApiKeyHeader,
                RemoteOpenApiApiKeyValue = options.RemoteOpenApiApiKeyValue,
                RemoteOpenApiBearerToken = options.RemoteOpenApiBearerToken,
                RemoteDefaultHeaders = new Dictionary<string, string>(options.RemoteDefaultHeaders),
            },
        ];
    }

    private static bool HasLegacyRemote(ApiTestSparkOptions options) =>
        !string.IsNullOrWhiteSpace(options.RemoteBaseUrl) ||
        !string.IsNullOrWhiteSpace(options.RemoteOpenApiUrl) ||
        options.RemoteDefaultHeaders.Count > 0;

    private static bool IsRemoteProfileConfigured(RemoteApiProfile profile) =>
        !string.IsNullOrWhiteSpace(profile.RemoteBaseUrl) ||
        !string.IsNullOrWhiteSpace(profile.RemoteOpenApiUrl) ||
        profile.RemoteDefaultHeaders.Count > 0;

    private static RemoteApiProfile NormalizeProfile(RemoteApiProfile profile)
    {
        if (string.IsNullOrWhiteSpace(profile.Id))
            profile.Id = Guid.NewGuid().ToString();
        if (string.IsNullOrWhiteSpace(profile.Name))
            profile.Name = profile.RemoteBaseUrl ?? profile.RemoteOpenApiUrl ?? "Remote API";
        profile.RemoteDefaultHeaders ??= new Dictionary<string, string>();
        return profile;
    }

    private static object ToConfigProfile(RemoteApiProfile profile, bool enableRemoteCallProxy) => new
    {
        id = profile.Id,
        name = profile.Name,
        description = profile.Description,
        remoteBaseUrl = profile.RemoteBaseUrl,
        remoteOpenApiUrl = profile.RemoteOpenApiUrl,
        remoteOpenApiApiKeyHeader = profile.RemoteOpenApiApiKeyHeader,
        remoteOpenApiApiKeyValue = (string?)null,
        remoteOpenApiBearerToken = (string?)null,
        remoteOpenApiApiKeyConfigured = !string.IsNullOrWhiteSpace(profile.RemoteOpenApiApiKeyValue),
        remoteOpenApiBearerTokenConfigured = !string.IsNullOrWhiteSpace(profile.RemoteOpenApiBearerToken),
        remoteOAuthConfigured = profile.OAuth is not null &&
            !string.IsNullOrWhiteSpace(profile.OAuth.TokenEndpointUrl) &&
            !string.IsNullOrWhiteSpace(profile.OAuth.ClientId) &&
            !string.IsNullOrWhiteSpace(profile.OAuth.ClientSecret),
        remoteDefaultHeaders = profile.RemoteDefaultHeaders,
        remoteCallProxyEnabled = enableRemoteCallProxy,
        source = "server",
        proxyMode = "server",
    };

    private static RemoteApiProfile ResolveHeaderTokens(RemoteApiProfile profile, ClaimsPrincipal user)
    {
        return new RemoteApiProfile
        {
            Id = profile.Id,
            Name = profile.Name,
            Description = profile.Description,
            RemoteBaseUrl = profile.RemoteBaseUrl,
            RemoteOpenApiUrl = profile.RemoteOpenApiUrl,
            RemoteOpenApiApiKeyHeader = profile.RemoteOpenApiApiKeyHeader,
            RemoteOpenApiApiKeyValue = profile.RemoteOpenApiApiKeyValue,
            RemoteOpenApiBearerToken = profile.RemoteOpenApiBearerToken,
            OAuth = profile.OAuth,
            RemoteDefaultHeaders = ResolveHeaderTokens(profile.RemoteDefaultHeaders, user),
        };
    }

    private static Dictionary<string, string> ResolveHeaderTokens(
        IReadOnlyDictionary<string, string> headers,
        ClaimsPrincipal user)
    {
        if (headers.Count == 0)
            return [];

        var resolvedUserName = ResolveUserName(user);
        var resolvedUserEmail = ResolveUserEmail(user);
        var resolvedUserId = ResolveUserId(user);
        return headers.ToDictionary(
            header => header.Key,
            header => ReplaceUserTokens(
                header.Value,
                resolvedUserName,
                resolvedUserEmail,
                resolvedUserId),
            StringComparer.Ordinal);
    }

    private static string ReplaceUserTokens(
        string value,
        string userName,
        string userEmail,
        string userId)
    {
        return value
            .Replace(UserNameToken, userName, StringComparison.Ordinal)
            .Replace(UserEmailToken, userEmail, StringComparison.Ordinal)
            .Replace(UserIdToken, userId, StringComparison.Ordinal);
    }

    private static Dictionary<string, string> ResolveProxyHeaderTokens(
        IReadOnlyDictionary<string, string> headers,
        ClaimsPrincipal user,
        HttpContext ctx)
    {
        if (headers.Count == 0)
            return [];

        var resolvedUserName = ResolveUserName(user);
        var resolvedUserEmail = ResolveUserEmail(user);
        var resolvedUserId = ResolveUserId(user);
        var requestGuid = ResolveRequestGuid(ctx);
        var sessionGuid = ResolveSessionGuid(ctx, requestGuid);

        return headers.ToDictionary(
            header => header.Key,
            header => ReplaceProxyTokens(
                header.Value,
                resolvedUserName,
                resolvedUserEmail,
                resolvedUserId,
                sessionGuid,
                requestGuid),
            StringComparer.Ordinal);
    }

    private static string ReplaceProxyTokens(
        string value,
        string userName,
        string userEmail,
        string userId,
        string sessionGuid,
        string requestGuid)
    {
        return value
            .Replace(UserNameToken, userName, StringComparison.Ordinal)
            .Replace(UserEmailToken, userEmail, StringComparison.Ordinal)
            .Replace(UserIdToken, userId, StringComparison.Ordinal)
            .Replace(SessionGuidToken, sessionGuid, StringComparison.Ordinal)
            .Replace(RequestGuidToken, requestGuid, StringComparison.Ordinal);
    }

    private static string ResolveRequestGuid(HttpContext ctx)
    {
        var fromHeader = ctx.Request.Headers[RequestGuidHeader].ToString();
        return string.IsNullOrWhiteSpace(fromHeader) ? Guid.NewGuid().ToString() : fromHeader;
    }

    private static string ResolveSessionGuid(HttpContext ctx, string fallback)
    {
        var fromHeader = ctx.Request.Headers[SessionGuidHeader].ToString();
        return string.IsNullOrWhiteSpace(fromHeader) ? fallback : fromHeader;
    }

    private static string ResolveUserName(ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
            return string.Empty;

        if (!string.IsNullOrWhiteSpace(user.Identity.Name))
            return user.Identity.Name;

        var fromNameClaim = user.FindFirst("name")?.Value;
        if (!string.IsNullOrWhiteSpace(fromNameClaim))
            return fromNameClaim;

        var fromPreferredUserNameClaim = user.FindFirst("preferred_username")?.Value;
        if (!string.IsNullOrWhiteSpace(fromPreferredUserNameClaim))
            return fromPreferredUserNameClaim;

        return string.Empty;
    }

    private static string ResolveUserEmail(ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
            return string.Empty;

        return FirstNonEmptyClaim(user, ClaimTypes.Email, "email", "preferred_username");
    }

    private static string ResolveUserId(ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
            return string.Empty;

        return FirstNonEmptyClaim(user, ClaimTypes.NameIdentifier, "sub", "oid");
    }

    private static string FirstNonEmptyClaim(ClaimsPrincipal user, params string[] claimTypes)
    {
        foreach (var claimType in claimTypes)
        {
            var value = user.FindFirst(claimType)?.Value;
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        return string.Empty;
    }

    private static bool TryResolveRemoteCallUri(RemoteApiProfile profile, string path, out Uri targetUri)
    {
        targetUri = null!;
        if (!Uri.TryCreate(profile.RemoteBaseUrl, UriKind.Absolute, out var baseUri) ||
            (baseUri.Scheme != Uri.UriSchemeHttp && baseUri.Scheme != Uri.UriSchemeHttps) ||
            string.IsNullOrWhiteSpace(path) ||
            !path.StartsWith("/", StringComparison.Ordinal) ||
            path.StartsWith("//", StringComparison.Ordinal) ||
            !Uri.TryCreate(path, UriKind.Relative, out _))
        {
            return false;
        }

        var candidate = new Uri(baseUri, path);
        if (!string.Equals(candidate.Scheme, baseUri.Scheme, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(candidate.Host, baseUri.Host, StringComparison.OrdinalIgnoreCase) ||
            candidate.Port != baseUri.Port)
        {
            return false;
        }

        targetUri = candidate;
        return true;
    }

    private static void CopyForwardableRequestHeaders(HttpRequest request, HttpRequestMessage remoteRequest)
    {
        foreach (var header in request.Headers)
        {
            if (IsBlockedRequestHeader(header.Key))
                continue;

            if (!remoteRequest.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                remoteRequest.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    private static void ApplyRemoteProfileHeaders(HttpRequestMessage request, IReadOnlyDictionary<string, string> headers)
    {
        foreach (var (key, value) in headers)
        {
            request.Headers.Remove(key);
            request.Content?.Headers.Remove(key);
            if (!request.Headers.TryAddWithoutValidation(key, value))
                request.Content?.Headers.TryAddWithoutValidation(key, value);
        }
    }

    private static void CopyForwardableResponseHeaders(HttpResponseMessage remoteResponse, HttpResponse response)
    {
        foreach (var header in remoteResponse.Headers.Concat(remoteResponse.Content.Headers))
        {
            if (IsBlockedResponseHeader(header.Key))
            {
                continue;
            }

            response.Headers[header.Key] = header.Value.ToArray();
        }
    }

    private static bool IsBlockedRequestHeader(string headerName) =>
        IsHopByHopHeader(headerName) ||
        string.Equals(headerName, "Host", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Cookie", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Authorization", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Origin", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Referer", StringComparison.OrdinalIgnoreCase) ||
        headerName.StartsWith("Sec-", StringComparison.OrdinalIgnoreCase);

    private static bool IsBlockedResponseHeader(string headerName) =>
        IsHopByHopHeader(headerName) ||
        string.Equals(headerName, "Content-Length", StringComparison.OrdinalIgnoreCase) ||
        // A remote response must never be able to set a cookie for the harness origin.
        string.Equals(headerName, "Set-Cookie", StringComparison.OrdinalIgnoreCase) ||
        headerName.StartsWith("Access-Control-", StringComparison.OrdinalIgnoreCase);

    private static bool IsHopByHopHeader(string headerName) =>
        string.Equals(headerName, "Connection", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Keep-Alive", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Proxy-Authenticate", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Proxy-Authorization", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "TE", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Trailer", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Transfer-Encoding", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(headerName, "Upgrade", StringComparison.OrdinalIgnoreCase);

    private static RemoteApiProfile? ResolveRemoteProfile(IReadOnlyList<RemoteApiProfile> profiles, string? profileId)
    {
        if (!string.IsNullOrWhiteSpace(profileId))
            return profiles.FirstOrDefault(p => string.Equals(p.Id, profileId, StringComparison.OrdinalIgnoreCase));

        return profiles.Count == 1 ? profiles[0] : null;
    }

    private static bool IsRedirect(System.Net.HttpStatusCode statusCode) =>
        (int)statusCode is >= 300 and <= 399;

    private static string ResolveHarnessBuildTimestampUtc(Assembly assembly)
    {
        var fromMetadata = assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(attribute => string.Equals(attribute.Key, BuildDateMetadataKey, StringComparison.Ordinal))
            ?.Value;

        if (DateTimeOffset.TryParse(fromMetadata, out var parsedMetadataTime))
            return parsedMetadataTime.UtcDateTime.ToString("O");

        if (!string.IsNullOrEmpty(assembly.Location))
            return File.GetLastWriteTimeUtc(assembly.Location).ToString("O");

        return DateTime.UtcNow.ToString("O");
    }

    private static async Task<string?> ReadContentWithLimit(HttpContent content, CancellationToken cancellationToken)
    {
        await using var stream = await content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        using var buffer = new MemoryStream();
        const int bufferSize = 81920;
        var temp = ArrayPool<byte>.Shared.Rent(bufferSize);
        try
        {
            int read;
            while ((read = await stream.ReadAsync(temp.AsMemory(0, bufferSize), cancellationToken).ConfigureAwait(false)) > 0)
            {
                if (buffer.Length + read > MaxRemoteSpecBytes)
                    return null;
                buffer.Write(temp, 0, read);
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(temp);
        }

        buffer.Position = 0;
        using var reader = new StreamReader(buffer);
        return await reader.ReadToEndAsync(cancellationToken).ConfigureAwait(false);
    }
}

// Marker class for typed ILogger category
internal sealed class ApiTestSparkMiddleware;
