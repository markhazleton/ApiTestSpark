using Microsoft.AspNetCore.Http.HttpResults;
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
             .WithDescription("Returns the full catalog of products held in the in-memory store. " +
                              "The list is pre-seeded with five products on startup.")
             .Produces<IReadOnlyList<Product>>(StatusCodes.Status200OK);

        group.MapGet("/{id}", GetById)
             .WithName("GetProductById")
             .WithSummary("Get a product by ID")
             .WithDescription("Returns a single product by its integer ID. " +
                              "Seeded IDs are 1–5. Returns 404 if no product exists with the given ID.")
             .Produces<Product>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
             .WithName("CreateProduct")
             .WithSummary("Create a new product")
             .WithDescription("Adds a product to the in-memory store. " +
                              "The **Id** field is assigned by the server — any value you supply is ignored. " +
                              "**Name** is required (1–100 chars). **Price** must be between 0.01 and 99,999.99.")
             .Produces<Product>(StatusCodes.Status201Created)
             .Produces<string>(StatusCodes.Status400BadRequest);

        group.MapPut("/{id}", Update)
             .WithName("UpdateProduct")
             .WithSummary("Update an existing product")
             .WithDescription("Replaces the product at the given ID with the supplied values. " +
                              "The **Id** in the URL is authoritative — the Id in the body is ignored. " +
                              "Returns 404 if no product exists with the given ID.")
             .Produces<Product>(StatusCodes.Status200OK)
             .Produces<string>(StatusCodes.Status400BadRequest)
             .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id}", Delete)
             .WithName("DeleteProduct")
             .WithSummary("Delete a product")
             .WithDescription("Removes the product with the given ID from the store permanently. " +
                              "Returns 204 No Content on success. Returns 404 if the product does not exist. " +
                              "**Note:** deleting a product that is referenced by an existing order does not " +
                              "affect those orders (prices are snapshotted at order time).")
             .Produces(StatusCodes.Status204NoContent)
             .Produces(StatusCodes.Status404NotFound);

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static Ok<IReadOnlyList<Product>> GetAll([FromServices] ProductCache cache) =>
        TypedResults.Ok(cache.GetAll());

    private static Results<Ok<Product>, NotFound> GetById(
        int id,
        [FromServices] ProductCache cache) =>
        cache.GetById(id) is { } product
            ? TypedResults.Ok(product)
            : TypedResults.NotFound();

    private static Results<Created<Product>, BadRequest<string>> Create(
        Product? product,
        [FromServices] ProductCache cache)
    {
        if (product is null) return TypedResults.BadRequest("Product body is required.");
        var created = cache.Add(product);
        return TypedResults.Created($"/products/{created.Id}", created);
    }

    private static Results<Ok<Product>, BadRequest<string>, NotFound> Update(
        int id,
        Product? product,
        [FromServices] ProductCache cache)
    {
        if (product is null) return TypedResults.BadRequest("Product body is required.");
        return cache.Update(id, product) is { } updated
            ? TypedResults.Ok(updated)
            : TypedResults.NotFound();
    }

    private static Results<NoContent, NotFound> Delete(
        int id,
        [FromServices] ProductCache cache) =>
        cache.Remove(id) ? TypedResults.NoContent() : TypedResults.NotFound();
}
