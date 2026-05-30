using ApiTestSpark;
using SampleApi.Customers;
using SampleApi.Home;
using SampleApi.Orders;
using SampleApi.Products;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSingleton<ProductCache>();
builder.Services.AddSingleton<CustomerCache>();
// OrderCache depends on ProductCache — resolve it explicitly so the seed data is consistent
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
