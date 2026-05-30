using System.Net;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using ApiTestSpark;

namespace ApiTestSpark.Tests;

[TestClass]
public class HarnessIntegrationTests
{
    private static WebApplication BuildTestApp(Action<ApiTestSparkOptions>? configure = null)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = Environments.Development,
        });
        builder.WebHost.UseTestServer();
        var app = builder.Build();
        app.MapApiTestSpark(configure);
        app.StartAsync().GetAwaiter().GetResult();
        return app;
    }

    [TestMethod]
    public async Task RootPath_Returns200_WithHtml()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var contentType = response.Content.Headers.ContentType?.MediaType;
        Assert.AreEqual("text/html", contentType);
    }

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
        StringAssert.Contains(body, "\"Bearer\"");
    }

    [TestMethod]
    public async Task ExtensionlessPath_Returns200_WithHtmlFallback()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/some-unknown-route");

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var contentType = response.Content.Headers.ContentType?.MediaType;
        Assert.AreEqual("text/html", contentType);
    }

    [TestMethod]
    public async Task UnknownFileExtension_Returns404_NotHtmlFallback()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-spark/nonexistent.js");

        Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);
    }

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
}
