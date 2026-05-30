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
    private const string ResourcePrefix = "ApiTestSpark.build.";
    private const string CorsPolicy = "ApiTestSpark.CorsPolicy";

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
        });

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
            };

            logger.LogDebug(
                "ApiTestSpark: Config served — openApiUrl={OpenApiUrl} authScheme={AuthScheme}",
                options.OpenApiUrl, options.AuthScheme);

            return Results.Json(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        });

        // SPA middleware — serve index.html fallback and set security headers
        app.Use(async (ctx, next) =>
        {
            if (!ctx.Request.Path.StartsWithSegments(MountPath))
            {
                await next(ctx);
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

            // Pass through to MapGet routes (e.g. /api-test-spark/config) before SPA fallback
            if (ctx.Request.Path.StartsWithSegments(ConfigPath))
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
            ctx.Response.Headers["Content-Security-Policy"] =
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                "connect-src 'self' https://*.applicationinsights.azure.com https://*.monitor.azure.com https://v2.jokeapi.dev https://jsonplaceholder.typicode.com";

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
}

// Marker class for typed ILogger category
internal sealed class ApiTestSparkMiddleware;
