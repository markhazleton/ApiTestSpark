using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Products;

/// <summary>
/// Registers all /products routes onto a <see cref="RouteGroupBuilder"/>.
/// Called from Program.cs: <c>app.MapGroup("/products").WithTags("Products").MapProducts();</c>
/// </summary>
public static class ProductEndpoints
{
    public static RouteGroupBuilder MapProducts(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetAll)
             .WithName("GetProducts")
             .WithSummary("List all products")
             .WithDescription("Returns the full list of products in the in-memory store.");

        group.MapGet("/{id:int}", GetById)
             .WithName("GetProductById")
             .WithSummary("Get a product by ID")
             .WithDescription("Returns a single product by its integer ID, or 404 if not found.");

        group.MapPost("/", Create)
             .WithName("CreateProduct")
             .WithSummary("Create a new product")
             .WithDescription("Adds a new product to the in-memory store. The Id field is assigned by the server.");

        group.MapPut("/{id:int}", Update)
             .WithName("UpdateProduct")
             .WithSummary("Update an existing product")
             .WithDescription("Replaces the product at the given ID. Returns 404 if the product does not exist.");

        group.MapDelete("/{id:int}", Delete)
             .WithName("DeleteProduct")
             .WithSummary("Delete a product")
             .WithDescription("Removes a product from the store by ID. Returns 204 on success, 404 if not found.");

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static IResult GetAll([FromServices] ProductCache cache) =>
        Results.Ok(cache.GetAll());

    private static IResult GetById(int id, [FromServices] ProductCache cache) =>
        cache.GetById(id) is { } product ? Results.Ok(product) : Results.NotFound();

    private static IResult Create(Product? product, [FromServices] ProductCache cache)
    {
        if (product is null) return Results.BadRequest("Product body is required.");
        var created = cache.Add(product);
        return Results.Created($"/products/{created.Id}", created);
    }

    private static IResult Update(int id, Product? product, [FromServices] ProductCache cache)
    {
        if (product is null) return Results.BadRequest("Product body is required.");
        return cache.Update(id, product) is { } updated ? Results.Ok(updated) : Results.NotFound();
    }

    private static IResult Delete(int id, [FromServices] ProductCache cache) =>
        cache.Remove(id) ? Results.NoContent() : Results.NotFound();
}
