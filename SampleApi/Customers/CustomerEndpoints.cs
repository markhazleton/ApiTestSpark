using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Customers;

/// <summary>
/// Registers all /customers routes onto a <see cref="RouteGroupBuilder"/>.
/// Called from Program.cs: <c>app.MapGroup("/customers").WithTags("Customers").MapCustomers();</c>
/// </summary>
public static class CustomerEndpoints
{
    public static RouteGroupBuilder MapCustomers(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetAll)
             .WithName("GetCustomers")
             .WithSummary("List all customers")
             .WithDescription("Returns all customer accounts in the in-memory store. " +
                              "Five customers are pre-seeded on startup with IDs 1–5.")
             .Produces<IReadOnlyList<Customer>>(StatusCodes.Status200OK);

        group.MapGet("/{id}", GetById)
             .WithName("GetCustomerById")
             .WithSummary("Get a customer by ID")
             .WithDescription("Returns a single customer by their integer ID. " +
                              "Seeded IDs are 1–5. Returns 404 if no customer exists with the given ID.")
             .Produces<Customer>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
             .WithName("CreateCustomer")
             .WithSummary("Create a new customer")
             .WithDescription("Adds a new customer to the in-memory store. " +
                              "The **Id** is assigned by the server — any value you supply is ignored. " +
                              "**Name** is required (1–150 chars). " +
                              "**Email** must be a valid email address (max 254 chars). " +
                              "**Phone** is optional.")
             .Produces<Customer>(StatusCodes.Status201Created)
             .Produces<string>(StatusCodes.Status400BadRequest);

        group.MapPut("/{id}", Update)
             .WithName("UpdateCustomer")
             .WithSummary("Update a customer")
             .WithDescription("Replaces the customer record at the given ID with the supplied values. " +
                              "The **Id** in the URL is authoritative. " +
                              "Returns 404 if no customer exists with the given ID.")
             .Produces<Customer>(StatusCodes.Status200OK)
             .Produces<string>(StatusCodes.Status400BadRequest)
             .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id}", Delete)
             .WithName("DeleteCustomer")
             .WithSummary("Delete a customer")
             .WithDescription("Permanently removes the customer with the given ID. " +
                              "Returns 204 No Content on success. Returns 404 if the customer does not exist. " +
                              "**Note:** existing orders for this customer are unaffected.")
             .Produces(StatusCodes.Status204NoContent)
             .Produces(StatusCodes.Status404NotFound);

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static Ok<IReadOnlyList<Customer>> GetAll([FromServices] CustomerCache cache) =>
        TypedResults.Ok(cache.GetAll());

    private static Results<Ok<Customer>, NotFound> GetById(
        int id,
        [FromServices] CustomerCache cache) =>
        cache.GetById(id) is { } customer
            ? TypedResults.Ok(customer)
            : TypedResults.NotFound();

    private static Results<Created<Customer>, BadRequest<string>> Create(
        Customer? customer,
        [FromServices] CustomerCache cache)
    {
        if (customer is null) return TypedResults.BadRequest("Customer body is required.");
        var created = cache.Add(customer);
        return TypedResults.Created($"/customers/{created.Id}", created);
    }

    private static Results<Ok<Customer>, BadRequest<string>, NotFound> Update(
        int id,
        Customer? customer,
        [FromServices] CustomerCache cache)
    {
        if (customer is null) return TypedResults.BadRequest("Customer body is required.");
        return cache.Update(id, customer) is { } updated
            ? TypedResults.Ok(updated)
            : TypedResults.NotFound();
    }

    private static Results<NoContent, NotFound> Delete(
        int id,
        [FromServices] CustomerCache cache) =>
        cache.Remove(id) ? TypedResults.NoContent() : TypedResults.NotFound();
}
