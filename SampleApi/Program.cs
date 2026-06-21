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
    options.EnableRemoteCallProxy = true;
    options.RemoteApiProfiles.Add(new RemoteApiProfile
    {
        Id = "jsonplaceholder-demo",
        Name = "JSONPlaceholder",
        Description = "Public demo API for posts, users, and comments.",
        RemoteBaseUrl = "https://jsonplaceholder.typicode.com",
        RemoteOpenApiUrl = "https://apitest.makeboldspark.com/openapi/v1.json",
        RemoteDefaultHeaders =
        {
            ["correlationId"] = "{request-guid}",
            ["sessionId"] = "{session-guid}",
        },
    });
    options.RemoteApiProfiles.Add(new RemoteApiProfile
    {
        Id = "make-bold-spark",
        Name = "API Make Bold Spark",
        Description = "Make Bold Spark - API.",
        RemoteBaseUrl = "https://makeboldspark.com",
        RemoteOpenApiUrl = "https://makeboldspark.com/openapi/v1.json",
    });
});

app.Run();
