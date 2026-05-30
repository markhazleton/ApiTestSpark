using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace SampleApi.Products;

/// <summary>A product in the catalog.</summary>
public record Product(
    [property: Description("Server-assigned unique identifier. Ignored on create.")]
    int Id,

    [property: Description("Display name shown in the catalog.")]
    [property: Required][property: MinLength(1)][property: MaxLength(100)]
    string Name,

    [property: Description("Unit price in USD. Must be greater than zero.")]
    [property: Required][property: Range(0.01, 99999.99)]
    decimal Price,

    [property: Description("Product category for grouping and filtering. E.g. 'Electronics', 'Tools', 'Office'.")]
    [property: MaxLength(50)]
    string? Category,

    [property: Description("Short marketing description shown in product listings.")]
    [property: MaxLength(500)]
    string? Description,

    [property: Description("Current stock quantity. Zero means out of stock.")]
    [property: Range(0, int.MaxValue)]
    int StockQuantity = 0
);
