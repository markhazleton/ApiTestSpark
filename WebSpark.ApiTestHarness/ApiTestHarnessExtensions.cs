using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace WebSpark.ApiTestHarness;

/// <summary>
/// Extension methods to register the API Test Harness in a .NET Minimal API application.
/// </summary>
public static class ApiTestHarnessExtensions
{
    private const string MountPath = "/api-test-harness";
    private const string ConfigPath = "/api-test-harness/config";
    private const string ResourcePrefix = "WebSpark.ApiTestHarness.build.";
    private const string CorsPolicy = "WebSpark.ApiTestHarness.CorsPolicy";

    /// <summary>
    /// Registers the API Test Harness SPA at <c>/api-test-harness/</c>.
    /// </summary>
    /// <remarks>
    /// <para>Prerequisites:</para>
    /// <list type="bullet">
    ///   <item>Call <c>app.UseForwardedHeaders()</c> BEFORE this method when running behind a
    ///   reverse proxy so <c>baseUrl</c> in the config response reflects the public URL.</item>
    ///   <item>The harness is always served at <c>/api-test-harness/</c>. Custom mount paths
    ///   are not supported in this release.</item>
    /// </list>
    /// </remarks>
    public static WebApplication MapApiTestHarness(
        this WebApplication app,
        Action<ApiTestHarnessOptions>? configure = null)
    {
        var options = new ApiTestHarnessOptions();
        configure?.Invoke(options);

        var logger = app.Services.GetRequiredService<ILogger<ApiTestHarnessExtensions>>();

        // (a) Verify embedded resources exist — catch silent 404 trap at startup
        var assembly = typeof(ApiTestHarnessExtensions).Assembly;
        var resourceNames = assembly.GetManifestResourceNames();
        if (!resourceNames.Any(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal)))
        {
            throw new InvalidOperationException(
                $"WebSpark.ApiTestHarness: No embedded resources found with prefix '{ResourcePrefix}'. " +
                $"Run pack.ps1 to build the React SPA before packing. Found resources: {string.Join(", ", resourceNames.Take(5))}");
        }

        // (b) Warn if sensitive headers are registered in DefaultHeaders
        var sensitiveKeys = new[] { "authorization", "cookie", "x-api-key", "x-auth-token" };
        foreach (var key in options.DefaultHeaders.Keys)
        {
            if (sensitiveKeys.Contains(key.ToLowerInvariant()))
            {
                logger.LogWarning(
                    "WebSpark.ApiTestHarness: DefaultHeaders contains '{Key}' which may expose " +
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
                    "WebSpark.ApiTestHarness: Harness not registered — environment '{Env}' is not in allowed list [{Allowed}].",
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
                    "WebSpark.ApiTestHarness: OpenApiUrl '{Url}' is not a valid URI. " +
                    "Endpoint autodiscovery may fail.", options.OpenApiUrl);
            }
        }

        // (e) CORS policy — same-origin by default, expandable via CorsOrigins
        app.UseCors(builder =>
        {
            if (options.CorsOrigins.Length > 0)
                builder.WithOrigins(options.CorsOrigins).AllowAnyHeader().AllowAnyMethod();
            else
                builder.SetIsOriginAllowed(origin =>
                    new Uri(origin).Host == "localhost" || origin == string.Empty);
        });

        // Register embedded static files under /api-test-harness
        var fileProvider = new EmbeddedFileProvider(assembly, "WebSpark.ApiTestHarness.build");
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = fileProvider,
            RequestPath = MountPath,
        });

        // Config endpoint
        app.MapGet(ConfigPath, (HttpContext ctx) =>
        {
            logger.LogInformation(
                "WebSpark.ApiTestHarness: Config requested from {RemoteIp}",
                ctx.Connection.RemoteIpAddress);

            var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
            var response = new
            {
                baseUrl,
                openApiUrl = options.OpenApiUrl,
                authScheme = options.AuthScheme,
                defaultHeaders = options.DefaultHeaders,
            };

            logger.LogDebug(
                "WebSpark.ApiTestHarness: Config served — openApiUrl={OpenApiUrl} authScheme={AuthScheme}",
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

            // Extensionless path → serve index.html (SPA fallback)
            if (options.EnableVerboseLogging)
            {
                var spaLogger = app.Services.GetRequiredService<ILogger<ApiTestHarnessMiddleware>>();
                spaLogger.LogDebug(
                    "WebSpark.ApiTestHarness: SPA fallback {RequestPath} -> index.html",
                    ctx.Request.Path);
            }

            ctx.Response.Headers["Cache-Control"] = "no-cache";
            ctx.Response.Headers["Content-Security-Policy"] =
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                "connect-src 'self' https://*.applicationinsights.azure.com https://*.monitor.azure.com";

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
            "WebSpark.ApiTestHarness: Mounted at {MountPath}/ — OpenAPI: {OpenApiUrl}",
            MountPath, options.OpenApiUrl ?? "(none)");

        return app;
    }
}

// Marker class for typed ILogger category
internal sealed class ApiTestHarnessMiddleware;
