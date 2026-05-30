using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using SampleApi.Customers;
using SampleApi.Products;

namespace SampleApi.Orders;

/// <summary>
/// Registers all /orders routes onto a <see cref="RouteGroupBuilder"/>.
/// Called from Program.cs: <c>app.MapGroup("/orders").WithTags("Orders: Lifecycle").MapOrders();</c>
/// </summary>
public static class OrderEndpoints
{
    public static RouteGroupBuilder MapOrders(this RouteGroupBuilder group)
    {
        // ── Queries ─────────────────────────────────────────────────────────

        group.MapGet("/", GetAll)
             .WithName("GetOrders")
             .WithSummary("List all orders")
             .WithDescription(
                 "Returns all orders across all customers, sorted by **PlacedAt** descending (newest first). " +
                 "**7 orders** are pre-seeded covering all 5 customers and all status values " +
                 "(Pending, Confirmed, Shipped, Delivered, Cancelled). " +
                 "Each order includes its line items with snapshotted prices and a computed **Total**.")
             .Produces<IReadOnlyList<Order>>(StatusCodes.Status200OK);

        group.MapGet("/{id}", GetById)
             .WithName("GetOrderById")
             .WithSummary("Get an order by ID")
             .WithDescription(
                 "Returns a single order by integer ID. Seeded IDs are **1–7**. " +
                 "Returns 404 if no order exists with the given ID.")
             .Produces<Order>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/customer/{customerId}", GetByCustomer)
             .WithName("GetOrdersByCustomer")
             .WithSummary("Get orders for a customer")
             .WithDescription(
                 "Returns all orders placed by the given customer ID, newest first. " +
                 "Returns an empty array (not 404) when the customer has placed no orders.\n\n" +
                 "Seeded order counts: customer 1 → 2 orders, customer 2 → 1, customer 3 → 2, " +
                 "customer 4 → 1, customer 5 → 1.")
             .Produces<IReadOnlyList<Order>>(StatusCodes.Status200OK);

        group.MapGet("/status/{status}", GetByStatus)
             .WithName("GetOrdersByStatus")
             .WithSummary("Get orders by status")
             .WithDescription(
                 "Returns all orders in the given status, newest first. " +
                 "Valid values: `Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`. " +
                 "Returns an empty array if no orders are in that status.\n\n" +
                 "**Seeded distribution:** Delivered (2), Pending (2), Shipped (1), Confirmed (1), Cancelled (1).")
             .Produces<IReadOnlyList<Order>>(StatusCodes.Status200OK);

        // ── Commands ────────────────────────────────────────────────────────

        group.MapPost("/", Create)
             .WithName("CreateOrder")
             .WithSummary("Place a new order")
             .WithDescription(
                 "Creates a new order for an existing customer. Product name and unit price are **snapshotted** " +
                 "from the catalog at order time. The order starts in **Pending** status.\n\n" +
                 "Returns **400** when:\n" +
                 "- `customerId` does not match an existing customer\n" +
                 "- any `productId` does not match an existing product\n" +
                 "- any line `quantity` is less than 1\n" +
                 "- `lines` is empty\n\n" +
                 "**Full workflow demo:**\n" +
                 "1. `POST /customers` — create a new customer, note the returned `id`\n" +
                 "2. `POST /products` — create a new product, note the returned `id`\n" +
                 "3. `POST /orders` — place an order using those ids\n" +
                 "4. `PATCH /orders/{id}/status?status=Confirmed` — advance the order\n" +
                 "5. `GET /orders/customer/{customerId}` — see all orders for your new customer\n\n" +
                 "**Example body:**\n```json\n" +
                 "{\n  \"customerId\": 1,\n  \"lines\": [\n" +
                 "    { \"productId\": 1, \"quantity\": 2 },\n" +
                 "    { \"productId\": 3, \"quantity\": 5 }\n  ]\n}\n```")
             .Produces<Order>(StatusCodes.Status201Created)
             .Produces<string>(StatusCodes.Status400BadRequest);

        group.MapPatch("/{id}/status", UpdateStatus)
             .WithName("UpdateOrderStatus")
             .WithSummary("Advance order status")
             .WithDescription(
                 "Sets the order to the specified status. Valid values: " +
                 "`Pending` → `Confirmed` → `Shipped` → `Delivered` (or `Cancelled` at any point). " +
                 "Pass the target status as the `status` query parameter.\n\n" +
                 "Returns the updated order on success, 404 if the order does not exist.")
             .Produces<Order>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id}", Cancel)
             .WithName("CancelOrder")
             .WithSummary("Cancel an order")
             .WithDescription(
                 "Soft-cancels the order by setting its status to **Cancelled**. " +
                 "The order record is retained for history. " +
                 "Returns 204 No Content on success, 404 if the order does not exist.")
             .Produces(StatusCodes.Status204NoContent)
             .Produces(StatusCodes.Status404NotFound);

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static Ok<IReadOnlyList<Order>> GetAll([FromServices] OrderCache cache) =>
        TypedResults.Ok(cache.GetAll());

    private static Results<Ok<Order>, NotFound> GetById(int id, [FromServices] OrderCache cache) =>
        cache.GetById(id) is { } o ? TypedResults.Ok(o) : TypedResults.NotFound();

    private static Ok<IReadOnlyList<Order>> GetByCustomer(int customerId, [FromServices] OrderCache cache) =>
        TypedResults.Ok(cache.GetByCustomer(customerId));

    private static Ok<IReadOnlyList<Order>> GetByStatus(OrderStatus status, [FromServices] OrderCache cache) =>
        TypedResults.Ok(cache.GetByStatus(status));

    private static Results<Created<Order>, BadRequest<string>> Create(
        CreateOrderRequest? request,
        [FromServices] OrderCache orders,
        [FromServices] CustomerCache customers,
        [FromServices] ProductCache products)
    {
        if (request is null) return TypedResults.BadRequest("Order request body is required.");
        if (customers.GetById(request.CustomerId) is null)
            return TypedResults.BadRequest($"Customer {request.CustomerId} not found.");
        if (request.Lines is not { Count: > 0 })
            return TypedResults.BadRequest("Order must contain at least one line item.");

        var lines = new List<OrderLine>();
        foreach (var line in request.Lines)
        {
            var product = products.GetById(line.ProductId);
            if (product is null)
                return TypedResults.BadRequest($"Product {line.ProductId} not found.");
            if (line.Quantity <= 0)
                return TypedResults.BadRequest($"Quantity for product {line.ProductId} must be greater than zero.");
            lines.Add(new OrderLine(product.Id, product.Name, line.Quantity, product.Price));
        }

        var created = orders.Add(new Order(0, request.CustomerId, OrderStatus.Pending, lines, DateTime.UtcNow));
        return TypedResults.Created($"/orders/{created.Id}", created);
    }

    private static Results<Ok<Order>, NotFound> UpdateStatus(
        int id, [FromQuery] OrderStatus status, [FromServices] OrderCache cache) =>
        cache.UpdateStatus(id, status) is { } u ? TypedResults.Ok(u) : TypedResults.NotFound();

    private static Results<NoContent, NotFound> Cancel(int id, [FromServices] OrderCache cache) =>
        cache.Cancel(id) ? TypedResults.NoContent() : TypedResults.NotFound();
}
