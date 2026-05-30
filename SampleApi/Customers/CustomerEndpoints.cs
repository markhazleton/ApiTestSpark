using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Customers;

/// <summary>
/// Registers all /customers routes onto a <see cref="RouteGroupBuilder"/>.
/// Called from Program.cs: <c>app.MapGroup("/customers").WithTags("Customers: Accounts").MapCustomers();</c>
/// </summary>
public static class CustomerEndpoints
{
    public static RouteGroupBuilder MapCustomers(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetAll)
             .WithName("GetCustomers")
             .WithSummary("List all customers")
             .WithDescription(
                 "Returns all customer accounts. **5 customers** are pre-seeded on startup with IDs 1–5. " +
                 "Each customer includes optional **Company**, **Phone**, and a full **Address** object.\n\n" +
                 "Seeded customers:\n" +
                 "- 1 — Alice Johnson (Acme Corp, Springfield IL)\n" +
                 "- 2 — Bob Smith (Shelbyville IL)\n" +
                 "- 3 — Carol White (White Consulting, Capital City IL)\n" +
                 "- 4 — David Brown (Brown Industries, Ogdenville OR)\n" +
                 "- 5 — Eve Martinez (North Haverbrook OR)")
             .Produces<IReadOnlyList<Customer>>(StatusCodes.Status200OK);

        group.MapGet("/{id}", GetById)
             .WithName("GetCustomerById")
             .WithSummary("Get a customer by ID")
             .WithDescription(
                 "Returns a single customer by integer ID, including their Address and Company fields. " +
                 "Seeded IDs are 1–5. Returns 404 if not found.")
             .Produces<Customer>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
             .WithName("CreateCustomer")
             .WithSummary("Create a new customer")
             .WithDescription(
                 "Adds a new customer to the in-memory store. The **Id** is assigned by the server. " +
                 "**Name** (required, max 150 chars) and **Email** (required, valid email format) are mandatory. " +
                 "**Phone**, **Company**, and **Address** are optional.\n\n" +
                 "**Try it:** Create a customer, copy its Id, then place an order for them via `POST /orders`.\n\n" +
                 "**Example request body:**\n```json\n" +
                 "{\n  \"id\": 0,\n  \"name\": \"Frank Castle\",\n  \"email\": \"frank@example.com\",\n" +
                 "  \"phone\": \"555-0199\",\n  \"company\": \"Castle Consulting\",\n" +
                 "  \"address\": {\n    \"street\": \"890 Birch Way\",\n    \"city\": \"New York\",\n" +
                 "    \"state\": \"NY\",\n    \"postalCode\": \"10001\",\n    \"country\": \"US\"\n  }\n}\n```")
             .Produces<Customer>(StatusCodes.Status201Created)
             .Produces<string>(StatusCodes.Status400BadRequest);

        group.MapPut("/{id}", Update)
             .WithName("UpdateCustomer")
             .WithSummary("Update a customer")
             .WithDescription(
                 "Replaces the customer record at the given ID. The **Id** in the URL is authoritative. " +
                 "Returns 404 if no customer exists with the given ID.")
             .Produces<Customer>(StatusCodes.Status200OK)
             .Produces<string>(StatusCodes.Status400BadRequest)
             .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id}", Delete)
             .WithName("DeleteCustomer")
             .WithSummary("Delete a customer")
             .WithDescription(
                 "Permanently removes the customer with the given ID. " +
                 "Returns 204 No Content on success. Returns 404 if the customer does not exist. " +
                 "**Note:** existing orders for this customer are retained.")
             .Produces(StatusCodes.Status204NoContent)
             .Produces(StatusCodes.Status404NotFound);

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static Ok<IReadOnlyList<Customer>> GetAll([FromServices] CustomerCache cache) =>
        TypedResults.Ok(cache.GetAll());

    private static Results<Ok<Customer>, NotFound> GetById(int id, [FromServices] CustomerCache cache) =>
        cache.GetById(id) is { } c ? TypedResults.Ok(c) : TypedResults.NotFound();

    private static Results<Created<Customer>, BadRequest<string>> Create(
        Customer? customer, [FromServices] CustomerCache cache)
    {
        if (customer is null) return TypedResults.BadRequest("Customer body is required.");
        var created = cache.Add(customer);
        return TypedResults.Created($"/customers/{created.Id}", created);
    }

    private static Results<Ok<Customer>, BadRequest<string>, NotFound> Update(
        int id, Customer? customer, [FromServices] CustomerCache cache)
    {
        if (customer is null) return TypedResults.BadRequest("Customer body is required.");
        return cache.Update(id, customer) is { } u ? TypedResults.Ok(u) : TypedResults.NotFound();
    }

    private static Results<NoContent, NotFound> Delete(int id, [FromServices] CustomerCache cache) =>
        cache.Remove(id) ? TypedResults.NoContent() : TypedResults.NotFound();
}
