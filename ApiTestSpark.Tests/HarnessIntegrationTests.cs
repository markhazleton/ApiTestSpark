using System.Net;
using System.Security.Claims;
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
        return BuildTestApp(configure, environment, requestUser: null);
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
        StringAssert.Contains(body, "\"userName\"");
        StringAssert.Contains(body, "\"userEmail\"");
        StringAssert.Contains(body, "\"userId\"");
        StringAssert.Contains(body, "\"Bearer\"");
    }

    [TestMethod]
    public async Task ConfigEndpoint_Returns401_WhenAuthenticationIsRequired_AndRequestIsAnonymous()
    {
        var app = BuildTestApp(o => o.RequireAuthenticatedUser = true);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");

        Assert.AreEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [TestMethod]
    public async Task ConfigEndpoint_Returns200_WhenAuthenticationIsRequired_AndRequestIsAuthenticated()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "alice")],
            authenticationType: "TestAuth"));

        var app = BuildTestApp(
            o => o.RequireAuthenticatedUser = true,
            environment: "Development",
            requestUser: user);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
    }

    [TestMethod]
    public async Task ConfigEndpoint_SetsVaryOrigin_WhenCorsOriginIsAllowed()
    {
        var app = BuildTestApp(o => o.CorsOrigins = ["https://portal.example.com"]);
        var client = app.GetTestClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api-test-spark/config");
        request.Headers.TryAddWithoutValidation("Origin", "https://portal.example.com");
        var response = await client.SendAsync(request);

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("https://portal.example.com",
            response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.IsTrue(response.Headers.TryGetValues("Vary", out var varyValues));
        Assert.IsTrue(varyValues.Any(value => value.Contains("Origin", StringComparison.OrdinalIgnoreCase)));
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

    [TestMethod]
    public async Task ConfigEndpoint_UsesAssemblyMetadataForHarnessBuiltAt()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        var harnessBuiltAt = doc.RootElement.GetProperty("harnessBuiltAt").GetString();
        Assert.IsFalse(string.IsNullOrWhiteSpace(harnessBuiltAt));
        Assert.IsTrue(DateTimeOffset.TryParse(harnessBuiltAt, out _));

        var expectedMetadataValue = typeof(ApiTestSparkExtensions).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(attribute => string.Equals(attribute.Key, "ApiTestSparkBuildDateUtc", StringComparison.Ordinal))
            ?.Value;

        Assert.IsFalse(string.IsNullOrWhiteSpace(expectedMetadataValue));
        Assert.AreEqual(expectedMetadataValue, harnessBuiltAt);
    }

    [TestMethod]
    public async Task ConfigEndpoint_HostAndRemoteConfiguration_AreReturnedInSeparateScopes()
    {
        var app = BuildTestApp(o =>
        {
            o.DefaultHeaders["X-Target"] = "host";
            o.RemoteBaseUrl = "https://legacy-remote.example.test";
            o.RemoteDefaultHeaders["X-Target"] = "legacy-remote";
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                Name = "Orders",
                RemoteBaseUrl = "https://orders.example.test",
                RemoteOpenApiUrl = "https://orders.example.test/openapi.json",
                RemoteDefaultHeaders = new Dictionary<string, string>
                {
                    ["X-Target"] = "orders-remote",
                },
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var config = doc.RootElement;

        Assert.IsFalse((config.GetProperty("baseUrl").GetString() ?? string.Empty).Contains("remote.example.test", StringComparison.Ordinal));
        Assert.AreEqual("host", config.GetProperty("defaultHeaders").GetProperty("X-Target").GetString());
        Assert.AreEqual("legacy-remote", config.GetProperty("remoteDefaultHeaders").GetProperty("X-Target").GetString());
        Assert.AreEqual("https://legacy-remote.example.test", config.GetProperty("remoteBaseUrl").GetString());

        var profile = config.GetProperty("remoteApiProfiles")[0];
        Assert.AreEqual("https://orders.example.test", profile.GetProperty("remoteBaseUrl").GetString());
        Assert.AreEqual("orders-remote", profile.GetProperty("remoteDefaultHeaders").GetProperty("X-Target").GetString());
        Assert.IsFalse(config.GetProperty("defaultHeaders").TryGetProperty("remoteBaseUrl", out _));
        Assert.IsFalse(profile.GetProperty("remoteDefaultHeaders").TryGetProperty("baseUrl", out _));
    }

    [TestMethod]
    public async Task ConfigEndpoint_UserNameToken_UsesIdentityName_WhenAuthenticated()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "alice")],
            authenticationType: "TestAuth"));

        var app = BuildTestApp(o =>
        {
            o.DefaultHeaders["X-User-Name"] = "{user-name}";
            o.RemoteDefaultHeaders["X-Remote-User-Name"] = "prefix-{user-name}-suffix";
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                Name = "Orders",
                RemoteBaseUrl = "https://orders.example.com",
                RemoteDefaultHeaders = new Dictionary<string, string>
                {
                    ["X-Profile-User"] = "{user-name}",
                },
            });
        },
        environment: "Development",
        requestUser: user);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        Assert.AreEqual("alice", doc.RootElement.GetProperty("userName").GetString());
        Assert.AreEqual("alice", doc.RootElement.GetProperty("defaultHeaders").GetProperty("X-User-Name").GetString());
        Assert.AreEqual("prefix-alice-suffix", doc.RootElement.GetProperty("remoteDefaultHeaders").GetProperty("X-Remote-User-Name").GetString());

        var profiles = doc.RootElement.GetProperty("remoteApiProfiles");
        Assert.AreEqual("alice",
            profiles[0].GetProperty("remoteDefaultHeaders").GetProperty("X-Profile-User").GetString());
    }

    [TestMethod]
    public async Task ConfigEndpoint_UserNameToken_UsesNameClaim_WhenIdentityNameMissing()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("name", "claim-name")],
            authenticationType: "TestAuth"));

        var app = BuildTestApp(
            o => o.DefaultHeaders["X-User-Name"] = "{user-name}",
            environment: "Development",
            requestUser: user);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        Assert.AreEqual("claim-name", doc.RootElement.GetProperty("defaultHeaders").GetProperty("X-User-Name").GetString());
    }

    [TestMethod]
    public async Task ConfigEndpoint_UserEmailAndIdTokens_UseStandardClaims_AcrossHeaderScopes()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim(ClaimTypes.Email, "alice@example.com"),
                new Claim(ClaimTypes.NameIdentifier, "user-123"),
            ],
            authenticationType: "TestAuth"));

        var app = BuildTestApp(o =>
        {
            o.DefaultHeaders["X-User-Email"] = "prefix-{user-email}-suffix";
            o.DefaultHeaders["X-User-Id"] = "{user-id}";
            o.RemoteDefaultHeaders["X-Remote-User-Email"] = "{user-email}";
            o.RemoteDefaultHeaders["X-Remote-User-Id"] = "id:{user-id}";
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                Name = "Orders",
                RemoteDefaultHeaders = new Dictionary<string, string>
                {
                    ["X-Profile-User-Email"] = "{user-email}",
                    ["X-Profile-User-Id"] = "{user-id}",
                },
            });
        },
        environment: "Development",
        requestUser: user);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        var defaultHeaders = doc.RootElement.GetProperty("defaultHeaders");
        Assert.AreEqual("alice@example.com", doc.RootElement.GetProperty("userEmail").GetString());
        Assert.AreEqual("user-123", doc.RootElement.GetProperty("userId").GetString());
        Assert.AreEqual("prefix-alice@example.com-suffix", defaultHeaders.GetProperty("X-User-Email").GetString());
        Assert.AreEqual("user-123", defaultHeaders.GetProperty("X-User-Id").GetString());

        var remoteHeaders = doc.RootElement.GetProperty("remoteDefaultHeaders");
        Assert.AreEqual("alice@example.com", remoteHeaders.GetProperty("X-Remote-User-Email").GetString());
        Assert.AreEqual("id:user-123", remoteHeaders.GetProperty("X-Remote-User-Id").GetString());

        var profileHeaders = doc.RootElement.GetProperty("remoteApiProfiles")[0]
            .GetProperty("remoteDefaultHeaders");
        Assert.AreEqual("alice@example.com", profileHeaders.GetProperty("X-Profile-User-Email").GetString());
        Assert.AreEqual("user-123", profileHeaders.GetProperty("X-Profile-User-Id").GetString());
    }

    [TestMethod]
    public async Task ConfigEndpoint_UserEmailAndIdTokens_UseEmailAndSubClaims_WhenStandardClaimsMissing()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("email", "alice@example.com"), new Claim("sub", "subject-123")],
            authenticationType: "TestAuth"));

        var app = BuildTestApp(o =>
        {
            o.DefaultHeaders["X-User-Email"] = "{user-email}";
            o.DefaultHeaders["X-User-Id"] = "{user-id}";
        },
        environment: "Development",
        requestUser: user);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var defaultHeaders = doc.RootElement.GetProperty("defaultHeaders");

        Assert.AreEqual("alice@example.com", defaultHeaders.GetProperty("X-User-Email").GetString());
        Assert.AreEqual("subject-123", defaultHeaders.GetProperty("X-User-Id").GetString());
    }

    [TestMethod]
    public async Task ConfigEndpoint_UserEmailAndIdTokens_UsePreferredUsernameAndOidClaims_WhenEarlierClaimsMissing()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("preferred_username", "alice@example.com"), new Claim("oid", "object-123")],
            authenticationType: "TestAuth"));

        var app = BuildTestApp(o =>
        {
            o.DefaultHeaders["X-User-Email"] = "{user-email}";
            o.DefaultHeaders["X-User-Id"] = "{user-id}";
        },
        environment: "Development",
        requestUser: user);
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var defaultHeaders = doc.RootElement.GetProperty("defaultHeaders");

        Assert.AreEqual("alice@example.com", defaultHeaders.GetProperty("X-User-Email").GetString());
        Assert.AreEqual("object-123", defaultHeaders.GetProperty("X-User-Id").GetString());
    }

    [TestMethod]
    public async Task ConfigEndpoint_UserNameToken_BecomesEmpty_WhenUnauthenticated()
    {
        var app = BuildTestApp(o =>
        {
            o.DefaultHeaders["X-User-Name"] = "prefix-{user-name}";
            o.DefaultHeaders["X-User-Email"] = "prefix-{user-email}";
            o.DefaultHeaders["X-User-Id"] = "prefix-{user-id}";
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        Assert.AreEqual(string.Empty, doc.RootElement.GetProperty("userName").GetString());
        Assert.AreEqual(string.Empty, doc.RootElement.GetProperty("userEmail").GetString());
        Assert.AreEqual(string.Empty, doc.RootElement.GetProperty("userId").GetString());
        Assert.AreEqual("prefix-", doc.RootElement.GetProperty("defaultHeaders").GetProperty("X-User-Name").GetString());
        Assert.AreEqual("prefix-", doc.RootElement.GetProperty("defaultHeaders").GetProperty("X-User-Email").GetString());
        Assert.AreEqual("prefix-", doc.RootElement.GetProperty("defaultHeaders").GetProperty("X-User-Id").GetString());
    }

    [TestMethod]
    public async Task ConfigEndpoint_RequestAndSessionGuidTokens_RemainUnchanged()
    {
        var app = BuildTestApp(o =>
        {
            o.DefaultHeaders["X-Request-Id"] = "{request-guid}";
            o.DefaultHeaders["X-Session-Id"] = "{session-guid}";
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        var defaultHeaders = doc.RootElement.GetProperty("defaultHeaders");
        Assert.AreEqual("{request-guid}", defaultHeaders.GetProperty("X-Request-Id").GetString());
        Assert.AreEqual("{session-guid}", defaultHeaders.GetProperty("X-Session-Id").GetString());
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

    // ── New: server-side OAuth (M-01, PR #7 pr-review) ───────────────────────

    [TestMethod]
    public async Task ConfigEndpoint_RemoteOAuthConfigured_TrueWhenFullyConfigured()
    {
        var app = BuildTestApp(o =>
        {
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "oauth-profile",
                RemoteOpenApiUrl = "https://example.com/openapi.json",
                OAuth = new RemoteApiProfileOAuth
                {
                    TokenEndpointUrl = "https://example.com/oauth/token",
                    ClientId = "client-id",
                    ClientSecret = "client-secret",
                },
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var profile = JsonDocument.Parse(body).RootElement.GetProperty("remoteApiProfiles")[0];

        Assert.IsTrue(profile.GetProperty("remoteOAuthConfigured").GetBoolean());
        // The client secret and token endpoint URL must never be serialized to the browser.
        Assert.IsFalse(body.Contains("client-secret"), "Client secret must not appear in config response");
        Assert.IsFalse(body.Contains("oauth/token"), "Token endpoint URL must not appear in config response");
    }

    [TestMethod]
    public async Task ConfigEndpoint_RemoteOAuthConfigured_FalseWhenNotConfigured()
    {
        var app = BuildTestApp(o =>
        {
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "no-oauth-profile",
                RemoteOpenApiUrl = "https://example.com/openapi.json",
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var body = await response.Content.ReadAsStringAsync();
        var profile = JsonDocument.Parse(body).RootElement.GetProperty("remoteApiProfiles")[0];

        Assert.IsFalse(profile.GetProperty("remoteOAuthConfigured").GetBoolean());
    }

    [TestMethod]
    public async Task RemoteSpec_InjectsOAuthBearerToken_WhenProfileHasOAuth()
    {
        static HttpResponseMessage Respond(HttpRequestMessage req) =>
            req.RequestUri!.AbsolutePath == "/oauth/token"
                ? new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"access_token":"tok-abc","token_type":"Bearer","expires_in":3600}""",
                        System.Text.Encoding.UTF8, "application/json"),
                }
                : new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"openapi":"3.0.0","info":{"title":"T","version":"1"},"paths":{}}""",
                        System.Text.Encoding.UTF8, "application/json"),
                };

        var handler = new RoutingHttpMessageHandler(Respond);
        var testClient = new HttpClient(handler);

        var app = BuildTestApp(o =>
        {
            o.TestHttpClient = testClient;
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "oauth-profile",
                RemoteOpenApiUrl = "https://example.com/openapi.json",
                OAuth = new RemoteApiProfileOAuth
                {
                    TokenEndpointUrl = "https://example.com/oauth/token",
                    ClientId = "client-id",
                    ClientSecret = "client-secret",
                },
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=oauth-profile");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var specRequest = handler.Requests.LastOrDefault(r => r.RequestUri!.AbsolutePath == "/openapi.json");
        Assert.IsNotNull(specRequest, "Expected a request to the remote OpenAPI URL");
        Assert.IsTrue(specRequest!.Headers.TryGetValues("Authorization", out var authValues),
            "Remote spec fetch must carry an Authorization header when OAuth is configured");
        Assert.AreEqual("Bearer tok-abc", authValues!.Single());
    }

    [TestMethod]
    public async Task RemoteSpec_ProceedsWithoutAuthHeader_WhenOAuthTokenAcquisitionFails()
    {
        static HttpResponseMessage Respond(HttpRequestMessage req) =>
            req.RequestUri!.AbsolutePath == "/oauth/token"
                ? new HttpResponseMessage(HttpStatusCode.Unauthorized)
                {
                    Content = new StringContent("""{"error":"invalid_client"}""", System.Text.Encoding.UTF8, "application/json"),
                }
                : new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"openapi":"3.0.0","info":{"title":"T","version":"1"},"paths":{}}""",
                        System.Text.Encoding.UTF8, "application/json"),
                };

        var handler = new RoutingHttpMessageHandler(Respond);
        var testClient = new HttpClient(handler);

        var app = BuildTestApp(o =>
        {
            o.TestHttpClient = testClient;
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                // Distinct id from the success-path test above — GetOAuthAccessTokenAsync caches
                // by profile.Id in a process-wide static dictionary (see L-01), so reusing the
                // same id here would silently return the other test's cached token instead of
                // exercising the acquisition-failure path.
                Id = "oauth-profile-acquisition-fails",
                RemoteOpenApiUrl = "https://example.com/openapi.json",
                OAuth = new RemoteApiProfileOAuth
                {
                    TokenEndpointUrl = "https://example.com/oauth/token",
                    ClientId = "client-id",
                    ClientSecret = "wrong-secret",
                },
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-spec?profileId=oauth-profile-acquisition-fails");

        // Fail-open: a token acquisition failure must not throw or block the proxy — it just
        // proceeds without the Authorization header (matches the existing RemoteOpenApiBearerToken
        // fail-open convention).
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var specRequest = handler.Requests.LastOrDefault(r => r.RequestUri!.AbsolutePath == "/openapi.json");
        Assert.IsNotNull(specRequest);
        Assert.IsFalse(specRequest!.Headers.TryGetValues("Authorization", out _),
            "No Authorization header should be sent when OAuth token acquisition failed");
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

    [TestMethod]
    public async Task RemoteCall_Returns403_WhenProxyIsNotEnabled()
    {
        var app = BuildTestApp(o => o.RemoteApiProfiles.Add(new RemoteApiProfile
        {
            Id = "orders",
            RemoteBaseUrl = "https://orders.example.test",
        }));
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/remote-call?profileId=orders&path=%2Fauthors");

        Assert.AreEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [TestMethod]
    public async Task ConfigEndpoint_ReportsWhetherRemoteCallProxyIsEnabled()
    {
        var app = BuildTestApp(o =>
        {
            o.EnableRemoteCallProxy = true;
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                RemoteBaseUrl = "https://orders.example.test",
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/config");
        var config = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

        Assert.IsTrue(config.GetProperty("remoteApiProfiles")[0]
            .GetProperty("remoteCallProxyEnabled").GetBoolean());
    }

    [TestMethod]
    public async Task RemoteCall_ProxiesConfiguredProfile_WithServerCredentials()
    {
        var remoteResponse = new HttpResponseMessage(HttpStatusCode.Created)
        {
            Content = new StringContent("{\"created\":true}", System.Text.Encoding.UTF8, "application/json"),
        };
        remoteResponse.Headers.TryAddWithoutValidation("Set-Cookie", "remote-session=secret");
        var handler = new RecordingHttpMessageHandler(remoteResponse);
        var testClient = new HttpClient(handler);

        var app = BuildTestApp(o =>
        {
            o.EnableRemoteCallProxy = true;
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                RemoteBaseUrl = "https://orders.example.test",
                RemoteOpenApiApiKeyHeader = "X-Api-Key",
                RemoteOpenApiApiKeyValue = "server-secret",
                RemoteOpenApiBearerToken = "server-token",
                RemoteDefaultHeaders = new Dictionary<string, string>
                {
                    ["X-Tenant"] = "contoso",
                    ["X-Correlation-Id"] = "{request-guid}",
                    ["X-Session-Id"] = "{session-guid}",
                },
            });
            o.TestHttpClient = testClient;
        });
        var client = app.GetTestClient();

        var request = new StringContent("{\"name\":\"Ada\"}", System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync(
            "/api-test-spark/remote-call?profileId=orders&path=%2Fapi%2Fauthors%3Flimit%3D5",
            request);

        Assert.AreEqual(HttpStatusCode.Created, response.StatusCode);
        Assert.AreEqual("{\"created\":true}", await response.Content.ReadAsStringAsync());
        Assert.AreEqual(HttpMethod.Post, handler.LastMethod);
        Assert.AreEqual("https://orders.example.test/api/authors?limit=5", handler.LastUri?.ToString());
        Assert.AreEqual("{\"name\":\"Ada\"}", handler.LastBody);
        Assert.AreEqual("contoso", handler.GetHeader("X-Tenant"));
        Assert.AreEqual("server-secret", handler.GetHeader("X-Api-Key"));
        Assert.AreEqual("Bearer server-token", handler.GetHeader("Authorization"));
        var correlationId = handler.GetHeader("X-Correlation-Id");
        var sessionId = handler.GetHeader("X-Session-Id");
        Assert.IsNotNull(correlationId);
        Assert.IsNotNull(sessionId);
        Assert.IsTrue(Guid.TryParse(correlationId, out _));
        Assert.IsTrue(Guid.TryParse(sessionId, out _));
        Assert.AreNotEqual("{request-guid}", correlationId);
        Assert.AreNotEqual("{session-guid}", sessionId);
        Assert.IsFalse(response.Headers.Contains("Set-Cookie"));
    }

    [TestMethod]
    public async Task RemoteCall_RejectsExternalTarget()
    {
        var app = BuildTestApp(o =>
        {
            o.EnableRemoteCallProxy = true;
            o.RemoteApiProfiles.Add(new RemoteApiProfile
            {
                Id = "orders",
                RemoteBaseUrl = "https://orders.example.test",
            });
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync(
            "/api-test-spark/remote-call?profileId=orders&path=https%3A%2F%2Fevil.example.test%2Fsteal");

        Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static WebApplication BuildTestApp(
        Action<ApiTestSparkOptions>? configure,
        string environment,
        ClaimsPrincipal? requestUser)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = environment,
        });
        builder.WebHost.UseTestServer();
        var app = builder.Build();

        if (requestUser is not null)
        {
            app.Use(async (ctx, next) =>
            {
                ctx.User = requestUser;
                await next(ctx);
            });
        }

        app.MapApiTestSpark(configure);
        app.StartAsync().GetAwaiter().GetResult();
        return app;
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

internal sealed class RecordingHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
{
    public HttpMethod? LastMethod { get; private set; }
    public Uri? LastUri { get; private set; }
    public string? LastBody { get; private set; }
    private Dictionary<string, string> Headers { get; } = new(StringComparer.OrdinalIgnoreCase);

    public string? GetHeader(string name) => Headers.GetValueOrDefault(name);

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastMethod = request.Method;
        LastUri = request.RequestUri;
        LastBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);

        foreach (var header in request.Headers)
            Headers[header.Key] = string.Join(",", header.Value);
        if (request.Content is not null)
            foreach (var header in request.Content.Headers)
                Headers[header.Key] = string.Join(",", header.Value);

        return response;
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

// Routes each outbound request to a caller-supplied responder based on the request itself
// (e.g. by RequestUri path), and records every request seen — used for OAuth token-acquisition
// tests where the same TestHttpClient must serve both the token endpoint and the remote spec URL.
internal sealed class RoutingHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
{
    public List<HttpRequestMessage> Requests { get; } = new();

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Requests.Add(request);
        return Task.FromResult(responder(request));
    }
}
