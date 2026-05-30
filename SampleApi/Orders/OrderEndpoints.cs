using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using SampleApi.Customers;
using SampleApi.Products;

namespace SampleApi.Orders;

/// <summary>
/// Registers all /orders routes onto a <see cref="RouteGroupBuilder"/>.
/// Called from Program.cs: <c>app.MapGroup("/orders").WithTags("Orders").MapOrders();</c>
/// </summary>
public static class OrderEndpoints
{
    public static RouteGroupBuilder MapOrders(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetAll)
             .WithName("GetOrders")
             .WithSummary("List all orders")
             .WithDescription("Returns all orders across all customers. " +
                              "Each order includes its line items, a computed **Total**, and the UTC **PlacedAt** timestamp. " +
                              "Four orders are pre-seeded on startup.")
             .Produces<IReadOnlyList<Order>>(StatusCodes.Status200OK);

        group.MapGet("/{id}", GetById)
             .WithName("GetOrderById")
             .WithSummary("Get an order by ID")
             .WithDescription("Returns a single order by its integer ID, including all line items and the computed total. " +
                              "Seeded order IDs are 1–4. Returns 404 if no order exists with the given ID.")
             .Produces<Order>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/customer/{customerId}", GetByCustomer)
             .WithName("GetOrdersByCustomer")
             .WithSummary("Get orders for a customer")
             .WithDescription("Returns all orders placed by the given customer ID. " +
                              "Returns an empty array (not 404) when the customer has placed no orders. " +
                              "Seeded customers 1 and 3 have existing orders; customer 2 has one order.")
             .Produces<IReadOnlyList<Order>>(StatusCodes.Status200OK);

        group.MapPost("/", Create)
             .WithName("CreateOrder")
             .WithSummary("Place a new order")
             .WithDescription("Creates a new order for an existing customer. " +
                              "Product name and unit price are **snapshotted** from the catalog at order time — " +
                              "subsequent price changes do not affect existing orders. " +
                              "The order starts in **Pending** status. " +
                              "\n\nReturns **400** if:\n" +
                              "- `customerId` does not match an existing customer\n" +
                              "- any `productId` does not match an existing product\n" +
                              "- any line item `quantity` is less than 1\n" +
                              "- `lines` is empty\n\n" +
                              "**Example request body:**\n```json\n" +
                              "{\n  \"customerId\": 1,\n  \"lines\": [\n    { \"productId\": 1, \"quantity\": 2 },\n    { \"productId\": 3, \"quantity\": 1 }\n  ]\n}\n```")
             .Produces<Order>(StatusCodes.Status201Created)
             .Produces<string>(StatusCodes.Status400BadRequest);

        group.MapPatch("/{id}/status", UpdateStatus)
             .WithName("UpdateOrderStatus")
             .WithSummary("Advance order status")
             .WithDescription("Sets the order to the specified status. Valid values: " +
                              "`Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`. " +
                              "Pass the target status as the `status` query parameter. " +
                              "Returns the updated order on success, 404 if the order does not exist.")
             .Produces<Order>(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id}", Cancel)
             .WithName("CancelOrder")
             .WithSummary("Cancel an order")
             .WithDescription("Sets the order status to **Cancelled**. " +
                              "This is a soft delete — the order record is retained and the status is updated. " +
                              "Returns 204 No Content on success, 404 if the order does not exist.")
             .Produces(StatusCodes.Status204NoContent)
             .Produces(StatusCodes.Status404NotFound);

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static Ok<IReadOnlyList<Order>> GetAll([FromServices] OrderCache cache) =>
        TypedResults.Ok(cache.GetAll());

    private static Results<Ok<Order>, NotFound> GetById(
        int id,
        [FromServices] OrderCache cache) =>
        cache.GetById(id) is { } order
            ? TypedResults.Ok(order)
            : TypedResults.NotFound();

    private static Ok<IReadOnlyList<Order>> GetByCustomer(
        int customerId,
        [FromServices] OrderCache cache) =>
        TypedResults.Ok(cache.GetByCustomer(customerId));

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

        var order   = new Order(0, request.CustomerId, OrderStatus.Pending, lines, DateTime.UtcNow);
        var created = orders.Add(order);
        return TypedResults.Created($"/orders/{created.Id}", created);
    }

    private static Results<Ok<Order>, NotFound> UpdateStatus(
        int id,
        [FromQuery] OrderStatus status,
        [FromServices] OrderCache cache) =>
        cache.UpdateStatus(id, status) is { } updated
            ? TypedResults.Ok(updated)
            : TypedResults.NotFound();

    private static Results<NoContent, NotFound> Cancel(
        int id,
        [FromServices] OrderCache cache) =>
        cache.Cancel(id) ? TypedResults.NoContent() : TypedResults.NotFound();
}
