using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Products;

/// <summary>
/// Registers all /products routes onto a <see cref="RouteGroupBuilder"/>.
/// Called from Program.cs: <c>app.MapGroup("/products").WithTags("Products: Catalog").MapProducts();</c>
/// </summary>
public static class ProductEndpoints
{
    public static RouteGroupBuilder MapProducts(this RouteGroupBuilder group)
    {
        // ── Catalog browsing ────────────────────────────────────────────────

        group.MapGet("/", GetAll)
             .WithName("GetProducts")
             .WithSummary("List all products")
             .WithDescription(
                 "Returns the full catalog of products. The list is pre-seeded with **10 products** " +
                 "across three categories: *Tools*, *Electronics*, and *Office*. " +
                 "Each product includes category, description, and current stock quantity.")
             .Produces<IReadOnlyList<Product>>(StatusCodes.Status200OK);

        group.MapGet("/{id}", GetById)
             .WithName("GetProductById")
             .WithSummary("Get a product by ID")
             .WithDescription(
                 "Returns a single product by its integer ID. " +
                 "Seeded IDs are **1–10**. Try IDs 1 (Widget), 2 (Gadget), or 6 (Gizmo Pro). " +
                 "Returns 404 if no product exists with the given ID.")
             .WithOpenApi(op =>
             {
                 op.Parameters[0].Description = "The unique integer ID of the product. Seeded IDs: 1–10.";
                 return op;
             })
             .Produces<Product>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/categories", GetCategories)
             .WithName("GetProductCategories")
             .WithSummary("List product categories")
             .WithDescription(
                 "Returns the distinct list of category names currently used in the catalog, sorted alphabetically. " +
                 "Useful for building filter menus. Seeded categories: *Electronics*, *Office*, *Tools*.")
             .Produces<IReadOnlyList<string>>(StatusCodes.Status200OK);

        group.MapGet("/category/{category}", GetByCategory)
             .WithName("GetProductsByCategory")
             .WithSummary("List products in a category")
             .WithDescription(
                 "Returns all products whose **Category** matches the given string (case-insensitive). " +
                 "Valid seeded values: `Electronics`, `Office`, `Tools`. " +
                 "Returns an empty array if no products belong to the category.")
             .WithOpenApi(op =>
             {
                 op.Parameters[0].Description = "Category name to filter by (case-insensitive). Seeded values: Electronics, Office, Tools.";
                 return op;
             })
             .Produces<IReadOnlyList<Product>>(StatusCodes.Status200OK);

        // ── Mutations ───────────────────────────────────────────────────────

        group.MapPost("/", Create)
             .WithName("CreateProduct")
             .WithSummary("Create a new product")
             .WithDescription(
                 "Adds a product to the in-memory store. The **Id** is assigned by the server. " +
                 "**Name** is required (1–100 chars). **Price** must be between 0.01 and 99,999.99. " +
                 "**Category**, **Description**, and **StockQuantity** are optional.\n\n" +
                 "**Try it:** Create a product, copy its Id, then create an order referencing it via `POST /orders`.")
             .Produces<Product>(StatusCodes.Status201Created)
             .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapPut("/{id}", Update)
             .WithName("UpdateProduct")
             .WithSummary("Update an existing product")
             .WithDescription(
                 "Replaces the product at the given ID with the supplied values. " +
                 "The **Id** in the URL is authoritative — the Id in the body is ignored. " +
                 "Returns 404 if no product exists with the given ID.")
             .WithOpenApi(op =>
             {
                 op.Parameters[0].Description = "The unique integer ID of the product to update. Seeded IDs: 1–10.";
                 return op;
             })
             .Produces<Product>(StatusCodes.Status200OK)
             .ProducesProblem(StatusCodes.Status400BadRequest)
             .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id}", Delete)
             .WithName("DeleteProduct")
             .WithSummary("Delete a product")
             .WithDescription(
                 "Permanently removes the product with the given ID. " +
                 "Returns 204 No Content on success. Returns 404 if the product does not exist. " +
                 "**Note:** existing order line items snapshot product name and price at order time, " +
                 "so deleting a product does not affect historical orders.")
             .WithOpenApi(op =>
             {
                 op.Parameters[0].Description = "The unique integer ID of the product to delete. Seeded IDs: 1–10.";
                 return op;
             })
             .Produces(StatusCodes.Status204NoContent)
             .Produces(StatusCodes.Status404NotFound);

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static Ok<IReadOnlyList<Product>> GetAll([FromServices] ProductCache cache) =>
        TypedResults.Ok(cache.GetAll());

    private static Results<Ok<Product>, NotFound> GetById(int id, [FromServices] ProductCache cache) =>
        cache.GetById(id) is { } p ? TypedResults.Ok(p) : TypedResults.NotFound();

    private static Ok<IReadOnlyList<string>> GetCategories([FromServices] ProductCache cache) =>
        TypedResults.Ok(cache.GetCategories());

    private static Ok<IReadOnlyList<Product>> GetByCategory(string category, [FromServices] ProductCache cache) =>
        TypedResults.Ok(cache.GetByCategory(category));

    private static Results<Created<Product>, ProblemHttpResult> Create(
        Product? product, [FromServices] ProductCache cache)
    {
        if (product is null) return TypedResults.Problem("Product body is required.", statusCode: 400);
        var created = cache.Add(product);
        return TypedResults.Created($"/products/{created.Id}", created);
    }

    private static Results<Ok<Product>, ProblemHttpResult, NotFound> Update(
        int id, Product? product, [FromServices] ProductCache cache)
    {
        if (product is null) return TypedResults.Problem("Product body is required.", statusCode: 400);
        return cache.Update(id, product) is { } u ? TypedResults.Ok(u) : TypedResults.NotFound();
    }

    private static Results<NoContent, NotFound> Delete(int id, [FromServices] ProductCache cache) =>
        cache.Remove(id) ? TypedResults.NoContent() : TypedResults.NotFound();
}
