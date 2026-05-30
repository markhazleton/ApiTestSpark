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
             .WithDescription("Returns all orders across all customers, including line items and totals.");

        group.MapGet("/{id:int}", GetById)
             .WithName("GetOrderById")
             .WithSummary("Get an order by ID")
             .WithDescription("Returns a single order by its integer ID, or 404 if not found.");

        group.MapGet("/customer/{customerId:int}", GetByCustomer)
             .WithName("GetOrdersByCustomer")
             .WithSummary("Get orders for a customer")
             .WithDescription("Returns all orders placed by the specified customer ID.");

        group.MapPost("/", Create)
             .WithName("CreateOrder")
             .WithSummary("Place a new order")
             .WithDescription(
                 "Creates a new order for an existing customer. Each line item references a product by ID. " +
                 "Product name and price are snapshotted from the current catalog at order time. " +
                 "Returns 400 if the customer or any product ID does not exist.");

        group.MapPatch("/{id:int}/status", UpdateStatus)
             .WithName("UpdateOrderStatus")
             .WithSummary("Update order status")
             .WithDescription(
                 "Advances an order to the given status (Pending, Confirmed, Shipped, Delivered, Cancelled). " +
                 "Pass the new status as a query parameter: ?status=Shipped");

        group.MapDelete("/{id:int}", Cancel)
             .WithName("CancelOrder")
             .WithSummary("Cancel an order")
             .WithDescription("Sets the order status to Cancelled. Returns 204 on success, 404 if not found.");

        return group;
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private static IResult GetAll([FromServices] OrderCache cache) =>
        Results.Ok(cache.GetAll());

    private static IResult GetById(int id, [FromServices] OrderCache cache) =>
        cache.GetById(id) is { } order ? Results.Ok(order) : Results.NotFound();

    private static IResult GetByCustomer(int customerId, [FromServices] OrderCache cache) =>
        Results.Ok(cache.GetByCustomer(customerId));

    private static IResult Create(
        CreateOrderRequest? request,
        [FromServices] OrderCache orders,
        [FromServices] CustomerCache customers,
        [FromServices] ProductCache products)
    {
        if (request is null) return Results.BadRequest("Order request body is required.");

        if (customers.GetById(request.CustomerId) is null)
            return Results.BadRequest($"Customer {request.CustomerId} not found.");

        if (request.Lines is not { Count: > 0 })
            return Results.BadRequest("Order must contain at least one line item.");

        var lines = new List<OrderLine>();
        foreach (var line in request.Lines)
        {
            var product = products.GetById(line.ProductId);
            if (product is null)
                return Results.BadRequest($"Product {line.ProductId} not found.");
            if (line.Quantity <= 0)
                return Results.BadRequest($"Quantity for product {line.ProductId} must be greater than zero.");

            lines.Add(new OrderLine(product.Id, product.Name, line.Quantity, product.Price));
        }

        var order = new Order(0, request.CustomerId, OrderStatus.Pending, lines, DateTime.UtcNow);
        var created = orders.Add(order);
        return Results.Created($"/orders/{created.Id}", created);
    }

    private static IResult UpdateStatus(
        int id,
        [FromQuery] OrderStatus status,
        [FromServices] OrderCache cache) =>
        cache.UpdateStatus(id, status) is { } updated ? Results.Ok(updated) : Results.NotFound();

    private static IResult Cancel(int id, [FromServices] OrderCache cache) =>
        cache.Cancel(id) ? Results.NoContent() : Results.NotFound();
}
