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
                Demonstration REST API for ApiTestSpark — showcasing OpenAPI autodiscovery,
                accordion endpoint grouping, request body scaffolding, and response rendering.

                ## Resource Groups

                | Group | Tag | Endpoints |
                |---|---|---|
                | Products: Catalog | catalog browsing + CRUD | 7 |
                | Customers: Accounts | customer account CRUD | 5 |
                | Orders: Lifecycle | order placement + status management | 7 |

                ## Seed Data

                All data is held **in memory** and resets when the process restarts.
                Pre-loaded on startup: **10 products** (3 categories), **5 customers** (with addresses),
                **7 orders** (all status values represented).

                ## Full Workflow Demo

                1. `GET /customers` — browse seeded customers
                2. `POST /customers` — create a new customer (note the returned `id`)
                3. `POST /products` — create a new product (note the returned `id`)
                4. `POST /orders` — place an order using those ids
                5. `PATCH /orders/{id}/status?status=Confirmed` — advance the order
                6. `GET /orders/customer/{customerId}` — see all orders for your customer
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
app.MapGroup("/products").WithTags("Products: Catalog").MapProducts();
app.MapGroup("/customers").WithTags("Customers: Accounts").MapCustomers();
app.MapGroup("/orders").WithTags("Orders: Lifecycle").MapOrders();
app.MapApiTestSpark(options => { options.OpenApiUrl = "/openapi/v1.json"; });

app.Run();
