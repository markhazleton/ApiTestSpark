using System.Net;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WebSpark.ApiTestHarness;
using Xunit;

namespace WebSpark.ApiTestHarness.Tests;

public class HarnessIntegrationTests
{
    private static WebApplication BuildTestApp(Action<ApiTestHarnessOptions>? configure = null)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = Environments.Development,
        });
        builder.WebHost.UseTestServer();
        var app = builder.Build();
        app.MapApiTestHarness(configure);
        app.StartAsync().GetAwaiter().GetResult();
        return app;
    }

    [Fact]
    public async Task RootPath_Returns200_WithHtml()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-harness/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var contentType = response.Content.Headers.ContentType?.MediaType;
        Assert.Equal("text/html", contentType);
    }

    [Fact]
    public async Task ConfigEndpoint_Returns200_WithExpectedKeys()
    {
        var app = BuildTestApp(o =>
        {
            o.OpenApiUrl = "/openapi.json";
            o.AuthScheme = "Bearer";
        });
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-harness/config");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"baseUrl\"", body);
        Assert.Contains("\"openApiUrl\"", body);
        Assert.Contains("\"authScheme\"", body);
        Assert.Contains("\"defaultHeaders\"", body);
        Assert.Contains("\"Bearer\"", body);
    }

    [Fact]
    public async Task ExtensionlessPath_Returns200_WithHtmlFallback()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-harness/some-unknown-route");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var contentType = response.Content.Headers.ContentType?.MediaType;
        Assert.Equal("text/html", contentType);
    }

    [Fact]
    public async Task UnknownFileExtension_Returns404_NotHtmlFallback()
    {
        var app = BuildTestApp();
        var client = app.GetTestClient();

        var response = await client.GetAsync("/api-test-harness/nonexistent.js");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public void EmbeddedResources_ContainExpectedPrefix()
    {
        var assembly = typeof(ApiTestHarnessExtensions).Assembly;
        var resourceNames = assembly.GetManifestResourceNames();

        Assert.True(
            resourceNames.Any(n => n.StartsWith("WebSpark.ApiTestHarness.build.", StringComparison.Ordinal)),
            $"No embedded resources found with prefix 'WebSpark.ApiTestHarness.build.'. " +
            $"Found: {string.Join(", ", resourceNames.Take(10))}");
    }
}
