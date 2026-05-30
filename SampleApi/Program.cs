using ApiTestSpark;
using SampleApi.Home;
using SampleApi.Products;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSingleton<ProductCache>();

var app = builder.Build();

app.UseForwardedHeaders();
app.MapOpenApi();

app.MapHome();
app.MapGroup("/products").WithTags("Products").MapProducts();
app.MapApiTestSpark(options => { options.OpenApiUrl = "/openapi/v1.json"; });

app.Run();
