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
    // Remote API Explorer — points at the JSONPlaceholder public API as a live demo target.
    // No auth required; correlation headers demonstrate the {request-guid}/{session-guid} tokens.
    options.RemoteBaseUrl    = "https://jsonplaceholder.typicode.com";
    options.RemoteOpenApiUrl = "https://apitest.makeboldspark.com/openapi/v1.json";
    options.RemoteDefaultHeaders["correlationId"] = "{request-guid}";
    options.RemoteDefaultHeaders["sessionId"]     = "{session-guid}";
});

app.Run();
