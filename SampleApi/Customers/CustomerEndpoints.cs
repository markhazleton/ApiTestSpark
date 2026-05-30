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
             .WithDescription("Returns the full list of customers in the in-memory store.");

        group.MapGet("/{id:int}", GetById)
             .WithName("GetCustomerById")
             .WithSummary("Get a customer by ID")
             .WithDescription("Returns a single customer by their integer ID, or 404 if not found.");

        group.MapPost("/", Create)
             .WithName("CreateCustomer")
             .WithSummary("Create a new customer")
             .WithDescription("Adds a new customer to the in-memory store. The Id field is assigned by the server.");

        group.MapPut("/{id:int}", Update)
             .WithName("UpdateCustomer")
             .WithSummary("Update a customer")
             .WithDescription("Replaces the customer record at the given ID. Returns 404 if not found.");

        group.MapDelete("/{id:int}", Delete)
             .WithName("DeleteCustomer")
             .WithSummary("Delete a customer")
             .WithDescription("Removes a customer from the store by ID. Returns 204 on success, 404 if not found.");

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static IResult GetAll([FromServices] CustomerCache cache) =>
        Results.Ok(cache.GetAll());

    private static IResult GetById(int id, [FromServices] CustomerCache cache) =>
        cache.GetById(id) is { } customer ? Results.Ok(customer) : Results.NotFound();

    private static IResult Create(Customer? customer, [FromServices] CustomerCache cache)
    {
        if (customer is null) return Results.BadRequest("Customer body is required.");
        var created = cache.Add(customer);
        return Results.Created($"/customers/{created.Id}", created);
    }

    private static IResult Update(int id, Customer? customer, [FromServices] CustomerCache cache)
    {
        if (customer is null) return Results.BadRequest("Customer body is required.");
        return cache.Update(id, customer) is { } updated ? Results.Ok(updated) : Results.NotFound();
    }

    private static IResult Delete(int id, [FromServices] CustomerCache cache) =>
        cache.Remove(id) ? Results.NoContent() : Results.NotFound();
}
