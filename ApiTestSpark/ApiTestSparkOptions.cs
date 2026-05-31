namespace ApiTestSpark;

/// <summary>
/// Configuration for the API Test Spark middleware.
/// Pass an action to <see cref="ApiTestSparkExtensions.MapApiTestSpark"/> to customise.
/// </summary>
public class ApiTestSparkOptions
{
    /// <summary>
    /// Relative or absolute URL to the host app's OpenAPI v3 JSON document.
    /// Default: "/openapi.json". Set to null to disable endpoint autodiscovery.
    /// </summary>
    public string? OpenApiUrl { get; set; } = "/openapi.json";

    /// <summary>
    /// Auth scheme advertised to the SPA (e.g. "Bearer", "ApiKey", "Basic").
    /// This is metadata only — never a token value.
    /// </summary>
    public string? AuthScheme { get; set; }

    /// <summary>
    /// Default headers injected into every SPA request to host app endpoints.
    /// MUST NOT contain actual credentials or tokens — values are served publicly
    /// via the config endpoint.
    /// </summary>
    public Dictionary<string, string> DefaultHeaders { get; set; } = new();

    /// <summary>
    /// Environments in which the harness is active. Empty array = all environments.
    /// Example: new[] { "Development", "Staging" }
    /// </summary>
    public string[] Environments { get; set; } = [];

    /// <summary>
    /// When true, emits ILogger.LogDebug for every static asset request and SPA fallback.
    /// Default: false. To enable diagnostics without redeploying, set
    /// Logging:LogLevel:ApiTestSpark.ApiTestHarness=Debug in appsettings at runtime.
    /// </summary>
    public bool EnableVerboseLogging { get; set; } = false;

    /// <summary>
    /// Additional origins allowed to call the config endpoint beyond same-origin.
    /// Default: empty (same-origin only).
    /// Use for local development when the SPA dev server and .NET API run on different ports,
    /// e.g. new[] { "http://localhost:5151" }.
    /// </summary>
    public string[] CorsOrigins { get; set; } = [];

    /// <summary>
    /// When true, the SPA shows the built-in demo integrations (JokeAPI and JSONPlaceholder)
    /// in the home screen and registers their routes. Set to false to hide these demos
    /// and present only your host API and the API Doc Builder.
    /// Default: true.
    /// </summary>
    public bool EnableDemoIntegrations { get; set; } = true;
}
