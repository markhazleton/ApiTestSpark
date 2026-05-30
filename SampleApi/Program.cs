using ApiTestSpark;
using Microsoft.OpenApi;
using SampleApi.Customers;
using SampleApi.Home;
using SampleApi.Orders;
using SampleApi.Products;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Info = new OpenApiInfo
        {
            Title       = "API Test Spark — Demo API",
            Version     = "v1",
            Description = """
                Demonstration REST API that shows ApiTestSpark's OpenAPI autodiscovery,
                endpoint grouping, request body scaffolding, and response rendering.

                Three resource groups are available:
                - **Products** — catalog management (CRUD)
                - **Customers** — customer account management (CRUD)
                - **Orders** — order placement and lifecycle management

                All data is held in memory and resets when the process restarts.
                Seed data is pre-loaded so you can start reading immediately.
                """,
            Contact = new OpenApiContact
            {
                Name  = "Mark Hazleton",
                Url   = new Uri("https://markhazleton.com"),
                Email = "mark@markhazleton.com",
            },
            License = new OpenApiLicense
            {
                Name = "MIT",
                Url  = new Uri("https://opensource.org/licenses/MIT"),
            },
        };
        return Task.CompletedTask;
    });
});

builder.Services.AddSingleton<ProductCache>();
builder.Services.AddSingleton<CustomerCache>();
builder.Services.AddSingleton<OrderCache>(sp =>
    new OrderCache(sp.GetRequiredService<ProductCache>()));

var app = builder.Build();

app.UseForwardedHeaders();
app.MapOpenApi();

app.MapHome();
app.MapGroup("/products").WithTags("Products").MapProducts();
app.MapGroup("/customers").WithTags("Customers").MapCustomers();
app.MapGroup("/orders").WithTags("Orders").MapOrders();
app.MapApiTestSpark(options => { options.OpenApiUrl = "/openapi/v1.json"; });

app.Run();
