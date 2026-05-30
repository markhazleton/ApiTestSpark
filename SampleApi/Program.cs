using WebSpark.ApiTestHarness;

using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Add OpenAPI (built-in .NET 9+ support)
builder.Services.AddOpenApi();

// In-memory product cache — singleton so state persists across all requests
builder.Services.AddSingleton<ProductCache>();

var app = builder.Build();

// Map OpenAPI document — .NET 10 default is /openapi/{documentName}.json
app.MapOpenApi();

// -----------------------------------------------------------------------
// Sample endpoints — these appear in the harness under "Your App's APIs"
// -----------------------------------------------------------------------

// Home page
app.MapGet("/", () => Results.Content("""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>SampleApi</title>
        <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; color: #222; }
            h1 { font-size: 2rem; margin-bottom: 0.25rem; }
            p  { color: #555; margin-bottom: 2rem; }
            a.btn {
                display: inline-block; padding: 0.75rem 1.5rem;
                background: #0078d4; color: #fff; border-radius: 6px;
                text-decoration: none; font-weight: 600;
            }
            a.btn:hover { background: #005a9e; }
            ul { margin-top: 2rem; line-height: 2; color: #444; }
            code { background: #f3f3f3; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.9rem; }
        </style>
    </head>
    <body>
        <h1>SampleApi</h1>
        <p>A minimal ASP.NET Core API demonstrating the WebSpark API Test Harness.</p>
        <a class="btn" href="/api-test-harness/">Open API Test Harness</a>
        <ul>
            <li><code>GET  /products</code> — list all products</li>
            <li><code>GET  /products/{id}</code> — get product by ID</li>
            <li><code>POST /products</code> — create a product</li>
            <li><code>PUT  /products/{id}</code> — update a product</li>
            <li><code>DELETE /products/{id}</code> — delete a product</li>
            <li><code>GET  /openapi/v1.json</code> — OpenAPI document</li>
        </ul>
    </body>
    </html>
    """, "text/html; charset=utf-8"));

app.MapGet("/products", ([FromServices] ProductCache cache) => cache.GetAll())
   .WithName("GetProducts")
   .WithSummary("List all products");

app.MapGet("/products/{id}", (int id, [FromServices] ProductCache cache) =>
    cache.GetById(id) is { } product
        ? Results.Ok(product)
        : Results.NotFound())
   .WithName("GetProductById")
   .WithSummary("Get a product by ID");

app.MapPost("/products", (Product? product, [FromServices] ProductCache cache) =>
{
    if (product is null) return Results.BadRequest("Product body is required.");
    var created = cache.Add(product);
    return Results.Created($"/products/{created.Id}", created);
})
   .WithName("CreateProduct")
   .WithSummary("Create a new product");

app.MapPut("/products/{id}", (int id, Product? product, [FromServices] ProductCache cache) =>
{
    if (product is null) return Results.BadRequest("Product body is required.");
    return cache.Update(id, product) is { } updated
        ? Results.Ok(updated)
        : Results.NotFound();
})
   .WithName("UpdateProduct")
   .WithSummary("Update an existing product");

app.MapDelete("/products/{id}", (int id, [FromServices] ProductCache cache) =>
    cache.Remove(id) ? Results.NoContent() : Results.NotFound())
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

class ProductCache
{
    private readonly List<Product> _products =
    [
        new(1, "Widget", 9.99m),
        new(2, "Gadget", 24.99m),
        new(3, "Doohickey", 4.49m),
    ];
    private int _nextId = 4;

    public IReadOnlyList<Product> GetAll() => _products.AsReadOnly();

    public Product? GetById(int id) => _products.FirstOrDefault(p => p.Id == id);

    public Product Add(Product product)
    {
        var created = product with { Id = _nextId++ };
        _products.Add(created);
        return created;
    }

    public Product? Update(int id, Product product)
    {
        var index = _products.FindIndex(p => p.Id == id);
        if (index < 0) return null;
        var updated = product with { Id = id };
        _products[index] = updated;
        return updated;
    }

    public bool Remove(int id)
    {
        var product = _products.FirstOrDefault(p => p.Id == id);
        if (product is null) return false;
        _products.Remove(product);
        return true;
    }
}
