using System.Net;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using ApiTestSpark;

namespace ApiTestSpark.Tests;

[TestClass]
public class HarnessIntegrationTests
{
    private static WebApplication BuildTestApp(
        Action<ApiTestSparkOptions>? configure = null,
        string environment = "Development")
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = environment,
        });
        builder.WebHost.UseTestServer();
        var app = builder.Build();
        app.MapApiTestSpark(configure);
        app.StartAsync().GetAwaiter().GetResult();
        return app;
    }

    // ── Existing: static file + SPA fallback ────────────────────────────────

    [TestMethod]
    public async Task RootPath_Returns200_WithHtml()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [TestMethod]
    public async Task ExtensionlessSubPath_Returns200_WithHtmlFallback()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/some-unknown-route");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("text/html", response.Content.Headers.ContentType?.MediaType);
    }

    [TestMethod]
    public async Task UnknownFileExtension_Returns404_NotHtmlFallback()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/nonexistent.js");

        Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── New: trailing-slash redirect ─────────────────────────────────────────

    [TestMethod]
    public async Task NoTrailingSlash_Redirects_ToTrailingSlash()
    {
        var app = BuildTestApp();
        // Do not follow redirects so we can assert the 302 itself.
        var client = app.GetTestClient();
        client.BaseAddress = new Uri("http://localhost");

        var response = await client.GetAsync("/api-test-spark");

        Assert.AreEqual(HttpStatusCode.Redirect, response.StatusCode);
        Assert.IsNotNull(response.Headers.Location);
        StringAssert.EndsWith(response.Headers.Location.ToString(), "/api-test-spark/");
    }

    // ── Existing: config endpoint ────────────────────────────────────────────

    [TestMethod]
    public async Task ConfigEndpoint_Returns200_WithExpectedKeys()
    {
        var app = BuildTestApp(o =>
        {
            o.OpenApiUrl = "/openapi.json";
            o.AuthScheme = "Bearer";
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        StringAssert.Contains(body, "\"baseUrl\"");
        StringAssert.Contains(body, "\"openApiUrl\"");
        StringAssert.Contains(body, "\"authScheme\"");
        StringAssert.Contains(body, "\"defaultHeaders\"");
        StringAssert.Contains(body, "\"enableDemoIntegrations\"");
        StringAssert.Contains(body, "\"Bearer\"");
    }

    // ── New: config values round-trip correctly ───────────────────────────────

    [TestMethod]
    public async Task ConfigEndpoint_EnableDemoIntegrations_DefaultsToTrue()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        Assert.IsTrue(doc.RootElement.GetProperty("enableDemoIntegrations").GetBoolean());
    }

    [TestMethod]
    public async Task ConfigEndpoint_EnableDemoIntegrations_ReflectsFalse()
    {
        var app = BuildTestApp(o => o.EnableDemoIntegrations = false);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        Assert.IsFalse(doc.RootElement.GetProperty("enableDemoIntegrations").GetBoolean());
    }

    [TestMethod]
    public async Task ConfigEndpoint_OpenApiUrl_Null_SerializesAsJsonNull()
    {
        var app = BuildTestApp(o => o.OpenApiUrl = null);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        Assert.AreEqual(JsonValueKind.Null, doc.RootElement.GetProperty("openApiUrl").ValueKind);
    }

    [TestMethod]
    public async Task ConfigEndpoint_DefaultHeaders_AppearsInBody()
    {
        var app = BuildTestApp(o => o.DefaultHeaders["X-Tenant-Id"] = "acme");
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();

        StringAssert.Contains(body, "X-Tenant-Id");
        StringAssert.Contains(body, "acme");
    }

    // ── New: config path passes through middleware, not SPA fallback ─────────

    [TestMethod]
    public async Task ConfigPath_NotHandledBySpaFallback_ReturnsJson()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var contentType = response.Content.Headers.ContentType?.MediaType;
        Assert.AreEqual("application/json", contentType);
    }

    // ── New: SPA fallback response headers ───────────────────────────────────

    [TestMethod]
    public async Task SpaFallback_SetsCacheControlNoCache()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        Assert.IsTrue(
            response.Headers.TryGetValues("Cache-Control", out var values),
            "Cache-Control header missing");
        StringAssert.Contains(string.Join(",", values), "no-cache");
    }

    [TestMethod]
    public async Task SpaFallback_SetsContentSecurityPolicyHeader()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        Assert.IsTrue(
            response.Headers.TryGetValues("Content-Security-Policy", out var values),
            "Content-Security-Policy header missing");
        var csp = string.Join(" ", values);
        StringAssert.Contains(csp, "default-src");
        StringAssert.Contains(csp, "script-src");
    }

    [TestMethod]
    public async Task SpaFallback_Development_CspAllowsLocalhostConnections()
    {
        var app = BuildTestApp(environment: Environments.Development);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        response.Headers.TryGetValues("Content-Security-Policy", out var values);
        var csp = string.Join(" ", values ?? []);
        StringAssert.Contains(csp, "ws://localhost:*");
    }

    [TestMethod]
    public async Task SpaFallback_Production_CspDoesNotAllowLocalhostConnections()
    {
        var app = BuildTestApp(environment: Environments.Production);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        response.Headers.TryGetValues("Content-Security-Policy", out var values);
        var csp = string.Join(" ", values ?? []);
        Assert.IsFalse(csp.Contains("ws://localhost:*"),
            "CSP should not include localhost WebSocket in Production");
    }

    // ── New: environment gating ───────────────────────────────────────────────

    [TestMethod]
    public async Task EnvironmentGating_SkipsRegistration_WhenEnvNotInList()
    {
        // Harness restricted to Staging; app runs as Production — should not mount.
        var app = BuildTestApp(
            o => o.Environments = ["Staging"],
            environment: Environments.Production);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);
    }

    [TestMethod]
    public async Task EnvironmentGating_MountsHarness_WhenEnvMatches()
    {
        var app = BuildTestApp(
            o => o.Environments = ["Staging"],
            environment: "Staging");
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
    }

    // ── New: CORS header behaviour ────────────────────────────────────────────

    [TestMethod]
    public async Task ConfigEndpoint_CorsHeader_PresentWhenOriginInAllowList()
    {
        var app = BuildTestApp(o => o.CorsOrigins = ["http://localhost:5151"]);
        var client = app.GetTestClient();
        client.DefaultRequestHeaders.Add("Origin", "http://localhost:5151");

        var response = await client.GetAsync("/api-test-spark/config");

        Assert.IsTrue(
            response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values),
            "Access-Control-Allow-Origin header missing");
        Assert.AreEqual("http://localhost:5151", values.First());
    }

    [TestMethod]
    public async Task ConfigEndpoint_CorsHeader_AbsentWhenOriginNotInAllowList()
    {
        var app = BuildTestApp(o => o.CorsOrigins = ["http://localhost:5151"]);
        var client = app.GetTestClient();
        client.DefaultRequestHeaders.Add("Origin", "http://evil.example.com");

        var response = await client.GetAsync("/api-test-spark/config");

        Assert.IsFalse(
            response.Headers.Contains("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Origin should not be set for unlisted origin");
    }

    // ── New: ApiTestSparkOptions defaults ────────────────────────────────────

    [TestMethod]
    public void Options_DefaultValues_AreCorrect()
    {
        var options = new ApiTestSparkOptions();

        Assert.AreEqual("/openapi.json", options.OpenApiUrl);
        Assert.IsNull(options.AuthScheme);
        Assert.IsNotNull(options.DefaultHeaders);
        Assert.AreEqual(0, options.DefaultHeaders.Count);
        Assert.AreEqual(0, options.Environments.Length);
        Assert.AreEqual(0, options.CorsOrigins.Length);
        Assert.IsFalse(options.EnableVerboseLogging);
        Assert.IsTrue(options.EnableDemoIntegrations);
    }

    // ── Existing: embedded resources ─────────────────────────────────────────

    [TestMethod]
    public void EmbeddedResources_ContainExpectedPrefix()
    {
        var assembly = typeof(ApiTestSparkExtensions).Assembly;
        var resourceNames = assembly.GetManifestResourceNames();

        Assert.IsTrue(
            resourceNames.Any(n => n.StartsWith("ApiTestSpark.build.", StringComparison.Ordinal)),
            $"No embedded resources found with prefix 'ApiTestSpark.build.'. " +
            $"Found: {string.Join(", ", resourceNames.Take(10))}");
    }

    // ── New: remote OpenAPI config ────────────────────────────────────────────

    [TestMethod]
    public async Task ConfigEndpoint_IncludesRemoteFields_WhenSet()
    {
        var app = BuildTestApp(o =>
        {
            o.RemoteOpenApiUrl = "https://example.com/openapi.json";
            o.RemoteOpenApiApiKeyHeader = "X-Api-Key";
            o.RemoteOpenApiApiKeyValue = "secret";
            o.RemoteOpenApiBearerToken = "tok";
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        var profiles = doc.RootElement.GetProperty("remoteApiProfiles");
        Assert.AreEqual(JsonValueKind.Array, profiles.ValueKind);
        Assert.AreEqual(1, profiles.GetArrayLength());
        var profile = profiles[0];
        Assert.AreEqual("legacy-remote-api", profile.GetProperty("id").GetString());
        Assert.AreEqual("https://example.com/openapi.json", profile.GetProperty("remoteOpenApiUrl").GetString());
        Assert.AreEqual("X-Api-Key", profile.GetProperty("remoteOpenApiApiKeyHeader").GetString());
        Assert.AreEqual(JsonValueKind.Null, profile.GetProperty("remoteOpenApiApiKeyValue").ValueKind);
        Assert.AreEqual(JsonValueKind.Null, profile.GetProperty("remoteOpenApiBearerToken").ValueKind);
        Assert.IsTrue(profile.GetProperty("remoteOpenApiApiKeyConfigured").GetBoolean());
        Assert.IsTrue(profile.GetProperty("remoteOpenApiBearerTokenConfigured").GetBoolean());
        Assert.AreEqual(JsonValueKind.Null, doc.RootElement.GetProperty("remoteOpenApiApiKeyValue").ValueKind);
        Assert.AreEqual(JsonValueKind.Null, doc.RootElement.GetProperty("remoteOpenApiBearerToken").ValueKind);
    }

    [TestMethod]
    public async Task ConfigEndpoint_RemoteFields_NullWhenNotConfigured()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        Assert.AreEqual(JsonValueKind.Null,
            doc.RootElement.GetProperty("remoteOpenApiUrl").ValueKind);
        Assert.AreEqual(JsonValueKind.Null,
            doc.RootElement.GetProperty("remoteOpenApiApiKeyHeader").ValueKind);
        Assert.AreEqual(JsonValueKind.Null,
            doc.RootElement.GetProperty("remoteOpenApiApiKeyValue").ValueKind);
        Assert.AreEqual(JsonValueKind.Null,
            doc.RootElement.GetProperty("remoteOpenApiBearerToken").ValueKind);
        Assert.AreEqual(0, doc.RootElement.GetProperty("remoteApiProfiles").GetArrayLength());
    }

    [TestMethod]
    public void Options_RemoteFields_DefaultNull()
    {
        var options = new ApiTestSparkOptions();

        Assert.IsNull(options.RemoteOpenApiUrl);
        Assert.IsNull(options.RemoteOpenApiApiKeyHeader);
        Assert.IsNull(options.RemoteOpenApiApiKeyValue);
        Assert.IsNull(options.RemoteOpenApiBearerToken);
        Assert.IsNotNull(options.RemoteApiProfiles);
        Assert.AreEqual(0, options.RemoteApiProfiles.Count);
    }

    [TestMethod]
    public async Task ConfigEndpoint_IncludesMultipleRemoteProfiles_WithDisplayMetadata()
    {
        var app = BuildTestApp(o =>
        {
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                Name = "Orders API",
                Description = "Order management endpoints.",
                RemoteBaseUrl = "https://orders.example.com",
                RemoteOpenApiUrl = "https://orders.example.com/openapi.json",
            });
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "billing",
                Name = "Billing API",
                Description = "Billing endpoints.",
                RemoteBaseUrl = "https://billing.example.com",
                RemoteOpenApiUrl = "https://billing.example.com/openapi.json",
                RemoteOpenApiBearerToken = "billing-token",
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var profiles = JsonDocument.Parse(body).RootElement.GetProperty("remoteApiProfiles");

        Assert.AreEqual(2, profiles.GetArrayLength());
        Assert.AreEqual("Orders API", profiles[0].GetProperty("name").GetString());
        Assert.AreEqual("Order management endpoints.", profiles[0].GetProperty("description").GetString());
        Assert.AreEqual("Billing API", profiles[1].GetProperty("name").GetString());
        Assert.AreEqual(JsonValueKind.Null, profiles[1].GetProperty("remoteOpenApiBearerToken").ValueKind);
        Assert.IsTrue(profiles[1].GetProperty("remoteOpenApiBearerTokenConfigured").GetBoolean());
    }

    // ── New: remote spec proxy — T023 (400 cases) ────────────────────────────

    [TestMethod]
    public async Task RemoteSpec_Returns400_WhenNotConfigured()
    {
        var app = BuildTestApp(); // no RemoteOpenApiUrl set
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=legacy-remote-api");

        Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [TestMethod]
    public async Task RemoteSpec_Returns400_ForFileScheme()
    {
        var app = BuildTestApp(o => o.RemoteOpenApiUrl = "file:///etc/passwd");
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=legacy-remote-api");

        Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        // SSRF guard — URL value must not appear in error message
        Assert.IsFalse(body.Contains("passwd"), "Error body must not contain URL path");
    }

    // ── New: remote spec proxy — T024 (proxy success + error paths) ──────────

    [TestMethod]
    public async Task RemoteSpec_Returns200_WhenRemoteServesJson()
    {
        const string openApiJson = """{"openapi":"3.0.0","info":{"title":"T","version":"1"},"paths":{}}""";
        var handler = new MockHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(openApiJson, System.Text.Encoding.UTF8, "application/json"),
            });
        var testClient = new HttpClient(handler);

        var app = BuildTestApp(o =>
        {
            o.RemoteOpenApiUrl = "https://example.com/openapi.json";
            o.TestHttpClient = testClient;
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=legacy-remote-api");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("application/json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        StringAssert.Contains(body, "openapi");
    }

    [TestMethod]
    public async Task RemoteSpec_Returns502_WhenRemoteServesHtml()
    {
        var handler = new MockHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("<html></html>", System.Text.Encoding.UTF8, "text/html"),
            });
        var testClient = new HttpClient(handler);

        var app = BuildTestApp(o =>
        {
            o.RemoteOpenApiUrl = "https://example.com/openapi.json";
            o.TestHttpClient = testClient;
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=legacy-remote-api");

        Assert.AreEqual(HttpStatusCode.BadGateway, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        StringAssert.Contains(body, "non-JSON");
    }

    [TestMethod]
    public async Task RemoteSpec_Returns502_OnTimeout()
    {
        var handler = new TimeoutHttpMessageHandler();
        var testClient = new HttpClient(handler) { Timeout = TimeSpan.FromMilliseconds(50) };

        var app = BuildTestApp(o =>
        {
            o.RemoteOpenApiUrl = "https://example.com/openapi.json";
            o.TestHttpClient = testClient;
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=legacy-remote-api");

        Assert.AreEqual(HttpStatusCode.BadGateway, response.StatusCode);
    }

    // ── New: remote spec proxy — T025 (no credentials in error body) ─────────

    [TestMethod]
    public async Task RemoteSpec_Returns502_WithNoCredentialsInBody_WhenRemoteFails()
    {
        var handler = new MockHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.Unauthorized));
        var testClient = new HttpClient(handler);

        var app = BuildTestApp(o =>
        {
            o.RemoteOpenApiUrl = "https://example.com/openapi.json";
            o.RemoteOpenApiApiKeyValue = "super-secret-key";
            o.RemoteOpenApiBearerToken = "bearer-token-value";
            o.TestHttpClient = testClient;
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec");
        var body = await response.Content.ReadAsStringAsync();

        Assert.AreEqual(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.IsFalse(body.Contains("super-secret-key"), "API key must not appear in error body");
        Assert.IsFalse(body.Contains("bearer-token-value"), "Bearer token must not appear in error body");
        Assert.IsFalse(body.Contains("example.com"), "URL must not appear in error body");
    }

    // ── New: remote spec proxy — T026a (SPA middleware pass-through) ─────────

    [TestMethod]
    public async Task RemoteSpec_ReturnsJson_NotHtmlFallback()
    {
        // Even without RemoteOpenApiUrl configured, the route must be reached (not SPA fallback)
        // and must return JSON (400 JSON), not text/html.
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec");

        var contentType = response.Content.Headers.ContentType?.MediaType;
        Assert.AreEqual("application/json", contentType,
            "remote-spec must return application/json, not text/html (SPA middleware pass-through check)");
    }

    [TestMethod]
    public async Task RemoteSpec_UsesProfileId_AndServerHeldCredentials()
    {
        const string openApiJson = """{"openapi":"3.0.0","info":{"title":"T","version":"1"},"paths":{}}""";
        var handler = new CapturingHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(openApiJson, System.Text.Encoding.UTF8, "application/json"),
            });
        var testClient = new HttpClient(handler);

        var app = BuildTestApp(o =>
        {
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                Name = "Orders API",
                RemoteOpenApiUrl = "https://orders.example.com/openapi.json",
                RemoteOpenApiApiKeyHeader = "X-Api-Key",
                RemoteOpenApiApiKeyValue = "server-secret",
                RemoteOpenApiBearerToken = "server-token",
            });
            o.TestHttpClient = testClient;
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=orders");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("https://orders.example.com/openapi.json", handler.LastRequest?.RequestUri?.ToString());
        Assert.IsNotNull(handler.LastRequest);
        Assert.IsTrue(handler.LastRequest.Headers.TryGetValues("X-Api-Key", out var apiKeyValues));
        Assert.AreEqual("server-secret", apiKeyValues.Single());
        Assert.AreEqual("Bearer server-token", handler.LastRequest?.Headers.Authorization?.ToString());
    }

    [TestMethod]
    public async Task RemoteSpec_RejectsUnknownProfileId()
    {
        var app = BuildTestApp(o =>
        {
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "known",
                Name = "Known",
                RemoteOpenApiUrl = "https://example.com/openapi.json",
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=browser-created");

        Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);
    }
}

// ── Test helpers ─────────────────────────────────────────────────────────────

internal sealed class MockHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
        => Task.FromResult(response);
}

internal sealed class CapturingHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
{
    public HttpRequestMessage? LastRequest { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = request;
        return Task.FromResult(response);
    }
}

internal sealed class TimeoutHttpMessageHandler : HttpMessageHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        await Task.Delay(Timeout.Infinite, cancellationToken);
        return new HttpResponseMessage(HttpStatusCode.OK);
    }
}
