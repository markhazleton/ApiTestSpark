using WebSpark.ApiTestHarness;

var builder = WebApplication.CreateBuilder(args);

// Add OpenAPI (built-in .NET 9+ support)
builder.Services.AddOpenApi();

var app = builder.Build();

// Map OpenAPI document — .NET 10 default is /openapi/{documentName}.json
app.MapOpenApi();

// -----------------------------------------------------------------------
// Sample endpoints — these appear in the harness under "Your App's APIs"
// -----------------------------------------------------------------------

var products = new List<Product>
{
    new(1, "Widget", 9.99m),
    new(2, "Gadget", 24.99m),
    new(3, "Doohickey", 4.49m),
};

app.MapGet("/products", () => products)
   .WithName("GetProducts")
   .WithSummary("List all products");

app.MapGet("/products/{id}", (int id) =>
    products.FirstOrDefault(p => p.Id == id) is { } product
        ? Results.Ok(product)
        : Results.NotFound())
   .WithName("GetProductById")
   .WithSummary("Get a product by ID");

app.MapPost("/products", (Product product) =>
{
    var newProduct = product with { Id = products.Max(p => p.Id) + 1 };
    products.Add(newProduct);
    return Results.Created($"/products/{newProduct.Id}", newProduct);
})
   .WithName("CreateProduct")
   .WithSummary("Create a new product");

app.MapDelete("/products/{id}", (int id) =>
{
    var product = products.FirstOrDefault(p => p.Id == id);
    if (product is null) return Results.NotFound();
    products.Remove(product);
    return Results.NoContent();
})
   .WithName("DeleteProduct")
   .WithSummary("Delete a product");

// -----------------------------------------------------------------------
// Install the API Test Harness — serves at /api-test-harness/
// -----------------------------------------------------------------------
app.MapApiTestHarness(options =>
{
    options.OpenApiUrl = "/openapi/v1.json";  // .NET 10 MapOpenApi() default
    options.AuthScheme = null;           // no auth on this sample
    options.Environments = ["Development"];
});

app.Run();

record Product(int Id, string Name, decimal Price);
