using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace SampleApi.Products;

/// <summary>A product in the catalog.</summary>
public record Product(
    /// <summary>Server-assigned unique identifier. Ignored on create; set by the store.</summary>
    [property: Description("Server-assigned unique identifier. Ignored on create.")]
    int Id,

    /// <summary>Display name shown in the catalog.</summary>
    [property: Description("Display name shown in the catalog.")]
    [property: Required]
    [property: MinLength(1)]
    [property: MaxLength(100)]
    string Name,

    /// <summary>Unit price in USD. Must be greater than zero.</summary>
    [property: Description("Unit price in USD. Must be greater than zero.")]
    [property: Required]
    [property: Range(0.01, 99999.99)]
    decimal Price
);
