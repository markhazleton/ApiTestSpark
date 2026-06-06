using ApiTestSpark;
using SampleApi.Customers;
using SampleApi.OpenApi;
using SampleApi.Home;
using SampleApi.Orders;
using SampleApi.Products;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi(options => options.AddSampleApiDocumentation());

builder.Services.AddSingleton<ProductCache>();
builder.Services.AddSingleton<CustomerCache>();
builder.Services.AddSingleton<OrderCache>(sp =>
    new OrderCache(sp.GetRequiredService<ProductCache>()));

var app = builder.Build();

app.UseForwardedHeaders();
app.MapGet("/favicon.ico", () => Results.NoContent()).ExcludeFromDescription();
app.MapOpenApi();

app.MapHome();
app.MapGroup("/products").WithTags("Products: Catalog").MapProducts();
app.MapGroup("/customers").WithTags("Customers: Accounts").MapCustomers();
app.MapGroup("/orders").WithTags("Orders: Lifecycle").MapOrders();
app.MapApiTestSpark(options =>
{
    options.OpenApiUrl = "/openapi/v1.json";
    options.RemoteBaseUrl = "https://sample.com";
    options.RemoteOpenApiUrl = "https://sample.com/openapi.json";
    options.RemoteOpenApiApiKeyHeader = "x-api-key";
    options.RemoteOpenApiApiKeyValue = "temp-dummy-key-for-sample-api";
    options.RemoteDefaultHeaders["correlationId"] = "{request-guid}";
    options.RemoteDefaultHeaders["sessionId"] = "{session-guid}";
});

app.Run();
