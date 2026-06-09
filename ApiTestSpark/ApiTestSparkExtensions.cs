using System.Net.Http;
using System.Reflection;
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
    private const string MountPath = "/api-test-spark";
    private const string ConfigPath = "/api-test-spark/config";
    private const string RemoteSpecPath = "/api-test-spark/remote-spec";
    private const string ResourcePrefix = "ApiTestSpark.build.";
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
        // TODO: In single-file publish / trimming scenarios assembly.Location is empty,
        // so the fallback returns wall-clock time instead of the real build date.
        // Fix: embed build date as <AssemblyMetadata> in the csproj so it survives trimming.
        var harnessBuiltAt = !string.IsNullOrEmpty(assembly.Location)
            ? File.GetLastWriteTimeUtc(assembly.Location).ToString("O")
            : DateTime.UtcNow.ToString("O");

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
                    ctx.Response.Headers["Access-Control-Allow-Origin"] = origin;
            }

            var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
            var response = new
            {
                baseUrl,
                openApiUrl = options.OpenApiUrl,
                authScheme = options.AuthScheme,
                defaultHeaders = options.DefaultHeaders,
                enableDemoIntegrations = options.EnableDemoIntegrations,
                remoteDefaultHeaders = options.RemoteDefaultHeaders,
                remoteBaseUrl = options.RemoteBaseUrl,
                remoteOpenApiUrl = options.RemoteOpenApiUrl,
                remoteOpenApiApiKeyHeader = options.RemoteOpenApiApiKeyHeader,
                remoteOpenApiApiKeyValue = (string?)null,
                remoteOpenApiBearerToken = (string?)null,
                remoteApiProfiles = remoteProfiles.Select(ToConfigProfile),
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
            HttpResponseMessage remoteResponse;
            try
            {
                remoteResponse = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted);
            }
            catch
            {
                // Network error or timeout — credentials MUST NOT appear in the message
                return Results.Json(new { error = "Failed to fetch remote OpenAPI document." }, statusCode: 502);
            }

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
                ctx.Request.Path.StartsWithSegments(RemoteSpecPath))
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
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
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
            await stream.CopyToAsync(ctx.Response.Body);
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

    private static object ToConfigProfile(RemoteApiProfile profile) => new
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
        remoteDefaultHeaders = profile.RemoteDefaultHeaders,
        source = "server",
        proxyMode = "server",
    };

    private static RemoteApiProfile? ResolveRemoteProfile(IReadOnlyList<RemoteApiProfile> profiles, string? profileId)
    {
        if (!string.IsNullOrWhiteSpace(profileId))
            return profiles.FirstOrDefault(p => string.Equals(p.Id, profileId, StringComparison.OrdinalIgnoreCase));

        return profiles.Count == 1 ? profiles[0] : null;
    }

    private static bool IsRedirect(System.Net.HttpStatusCode statusCode) =>
        (int)statusCode is >= 300 and <= 399;

    private static async Task<string?> ReadContentWithLimit(HttpContent content, CancellationToken cancellationToken)
    {
        await using var stream = await content.ReadAsStreamAsync(cancellationToken);
        using var buffer = new MemoryStream();
        var temp = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(temp.AsMemory(0, temp.Length), cancellationToken)) > 0)
        {
            if (buffer.Length + read > MaxRemoteSpecBytes)
                return null;
            buffer.Write(temp, 0, read);
        }

        buffer.Position = 0;
        using var reader = new StreamReader(buffer);
        return await reader.ReadToEndAsync(cancellationToken);
    }
}

// Marker class for typed ILogger category
internal sealed class ApiTestSparkMiddleware;
