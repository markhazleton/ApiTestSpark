using System.Net.Http;

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

    /// <summary>
    /// Headers injected into every SPA request when calling a remote API
    /// (i.e. when <see cref="RemoteBaseUrl"/> is set).
    /// These headers are separate from <see cref="DefaultHeaders"/> and only apply
    /// to remote calls — they do not affect requests to the local host app.
    /// Values are served via <c>/api-test-spark/config</c>; the harness MUST NOT be
    /// exposed to the public internet.
    /// </summary>
    public Dictionary<string, string> RemoteDefaultHeaders { get; set; } = new();

    /// <summary>
    /// Optional base URL used for all API calls when testing a remote API.
    /// When set, the SPA uses this URL as the base for every endpoint request instead
    /// of the host app's own origin. Must begin with <c>http://</c> or <c>https://</c>.
    /// Default: null (use the host app's own origin).
    /// </summary>
    public string? RemoteBaseUrl { get; set; }

    /// <summary>
    /// Optional URL of a remote OpenAPI v3 JSON document.
    /// When set, the SPA fetches this document via the server-side proxy at
    /// <c>/api-test-spark/remote-spec</c> instead of discovering endpoints locally.
    /// Must begin with <c>http://</c> or <c>https://</c>.
    /// Default: null (use local endpoint discovery).
    /// </summary>
    public string? RemoteOpenApiUrl { get; set; }

    /// <summary>
    /// Header name used to send an API key when fetching the remote OpenAPI document
    /// (e.g. <c>"X-Api-Key"</c>). Requires <see cref="RemoteOpenApiApiKeyValue"/> to also be set.
    /// Default: null.
    /// </summary>
    public string? RemoteOpenApiApiKeyHeader { get; set; }

    /// <summary>
    /// API key value sent in the <see cref="RemoteOpenApiApiKeyHeader"/> header when fetching
    /// the remote OpenAPI document. This value is returned in the <c>/api-test-spark/config</c>
    /// response — the harness endpoint is trusted for local/development use only and
    /// MUST NOT be exposed to the public internet.
    /// Default: null.
    /// </summary>
    public string? RemoteOpenApiApiKeyValue { get; set; }

    /// <summary>
    /// Bearer token sent as <c>Authorization: Bearer {token}</c> when fetching the remote
    /// OpenAPI document. This value is returned in the <c>/api-test-spark/config</c>
    /// response — the harness endpoint is trusted for local/development use only and
    /// MUST NOT be exposed to the public internet.
    /// Default: null.
    /// </summary>
    public string? RemoteOpenApiBearerToken { get; set; }

    /// <summary>
    /// Optional <see cref="System.Net.Http.HttpClient"/> override for the remote spec proxy.
    /// Intended for integration testing only — allows injecting a test <c>HttpClient</c>
    /// without replacing the shared static instance.
    /// Leave <c>null</c> in production; the harness uses its own shared client by default.
    /// </summary>
    [System.ComponentModel.EditorBrowsable(System.ComponentModel.EditorBrowsableState.Never)]
    public HttpClient? TestHttpClient { get; set; }
}
