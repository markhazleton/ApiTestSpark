namespace SampleApi.Orders;

/// <summary>A single line item within an order.</summary>
/// <param name="ProductId">ID of the product ordered.</param>
/// <param name="ProductName">Snapshot of the product name at order time.</param>
/// <param name="Quantity">Number of units ordered.</param>
/// <param name="UnitPrice">Price per unit at the time of the order.</param>
public record OrderLine(int ProductId, string ProductName, int Quantity, decimal UnitPrice)
{
    /// <summary>Line total (Quantity × UnitPrice).</summary>
    public decimal LineTotal => Quantity * UnitPrice;
}

/// <summary>Represents a customer order.</summary>
/// <param name="Id">Unique identifier assigned by the server.</param>
/// <param name="CustomerId">ID of the customer who placed the order.</param>
/// <param name="Status">Current order status.</param>
/// <param name="Lines">Line items in this order.</param>
/// <param name="PlacedAt">UTC timestamp when the order was placed.</param>
public record Order(
    int Id,
    int CustomerId,
    OrderStatus Status,
    IReadOnlyList<OrderLine> Lines,
    DateTime PlacedAt)
{
    /// <summary>Sum of all line totals.</summary>
    public decimal Total => Lines.Sum(l => l.LineTotal);
}

/// <summary>Payload for creating a new order.</summary>
/// <param name="CustomerId">ID of the customer placing the order.</param>
/// <param name="Lines">Line items to include.</param>
public record CreateOrderRequest(int CustomerId, IReadOnlyList<OrderLineRequest> Lines);

/// <summary>A line item in an order creation request.</summary>
/// <param name="ProductId">ID of the product to order.</param>
/// <param name="Quantity">Number of units.</param>
public record OrderLineRequest(int ProductId, int Quantity);

/// <summary>Possible lifecycle states of an order.</summary>
public enum OrderStatus { Pending, Confirmed, Shipped, Delivered, Cancelled }
