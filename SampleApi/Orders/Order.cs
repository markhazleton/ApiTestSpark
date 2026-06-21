using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SampleApi.Orders;

/// <summary>A single line item within an order.</summary>
public record OrderLine(
    /// <summary>ID of the product ordered.</summary>
    [property: Description("ID of the product ordered.")]
    int ProductId,

    /// <summary>Product name captured at the moment the order was placed.</summary>
    [property: Description("Product name captured at the moment the order was placed.")]
    string ProductName,

    /// <summary>Number of units ordered. Must be at least 1.</summary>
    [property: Description("Number of units ordered. Must be at least 1.")]
    [property: Range(1, int.MaxValue)]
    int Quantity,

    /// <summary>Price per unit captured at the moment the order was placed (USD).</summary>
    [property: Description("Price per unit captured at the moment the order was placed (USD).")]
    decimal UnitPrice)
{
    /// <summary>Line total: Quantity × UnitPrice.</summary>
    [Description("Line total: Quantity × UnitPrice.")]
    public decimal LineTotal => Quantity * UnitPrice;
}

/// <summary>A customer order with line items and a computed total.</summary>
public record Order(
    /// <summary>Server-assigned unique identifier.</summary>
    [property: Description("Server-assigned unique identifier.")]
    int Id,

    /// <summary>ID of the customer who placed the order.</summary>
    [property: Description("ID of the customer who placed the order.")]
    int CustomerId,

    /// <summary>Current lifecycle status of the order.</summary>
    [property: Description("Current lifecycle status of the order.")]
    OrderStatus Status,

    /// <summary>Line items included in this order.</summary>
    [property: Description("Line items included in this order.")]
    [property: MinLength(1)]
    IReadOnlyList<OrderLine> Lines,

    /// <summary>UTC timestamp when the order was placed.</summary>
    [property: Description("UTC timestamp when the order was placed.")]
    DateTime PlacedAt)
{
    /// <summary>Sum of all line totals (computed, not stored).</summary>
    [Description("Sum of all line totals (computed, not stored).")]
    public decimal Total => Lines.Sum(l => l.LineTotal);
}

/// <summary>Request body for placing a new order.</summary>
public record CreateOrderRequest(
    /// <summary>ID of the customer placing the order. Must refer to an existing customer.</summary>
    [property: Description("ID of the customer placing the order. Must refer to an existing customer.")]
    [property: Required]
    int CustomerId,

    /// <summary>One or more line items. Each product ID must exist in the catalog.</summary>
    [property: Description("One or more line items. Each product ID must exist in the catalog.")]
    [property: Required]
    [property: MinLength(1)]
    IReadOnlyList<OrderLineRequest> Lines
);

/// <summary>A single line item in a CreateOrderRequest.</summary>
public record OrderLineRequest(
    /// <summary>ID of the product to order. Must refer to an existing product.</summary>
    [property: Description("ID of the product to order. Must refer to an existing product.")]
    [property: Required]
    int ProductId,

    /// <summary>Number of units to order. Must be greater than zero.</summary>
    [property: Description("Number of units to order. Must be greater than zero.")]
    [property: Required]
    [property: Range(1, 10000)]
    int Quantity
);

/// <summary>Lifecycle states an order can occupy.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderStatus
{
    /// <summary>Order received, awaiting confirmation.</summary>
    Pending,
    /// <summary>Order confirmed and being prepared.</summary>
    Confirmed,
    /// <summary>Order dispatched to the carrier.</summary>
    Shipped,
    /// <summary>Order delivered to the customer.</summary>
    Delivered,
    /// <summary>Order cancelled — no further transitions possible.</summary>
    Cancelled,
}
