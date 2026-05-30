using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace SampleApi.Customers;

/// <summary>A customer account.</summary>
public record Customer(
    /// <summary>Server-assigned unique identifier. Ignored on create; set by the store.</summary>
    [property: Description("Server-assigned unique identifier. Ignored on create.")]
    int Id,

    /// <summary>Full name of the customer.</summary>
    [property: Description("Full name of the customer.")]
    [property: Required]
    [property: MinLength(1)]
    [property: MaxLength(150)]
    string Name,

    /// <summary>Contact email address. Must be a valid email format.</summary>
    [property: Description("Contact email address. Must be a valid email format.")]
    [property: Required]
    [property: EmailAddress]
    [property: MaxLength(254)]
    string Email,

    /// <summary>Optional contact phone number.</summary>
    [property: Description("Optional contact phone number.")]
    [property: Phone]
    [property: MaxLength(30)]
    string? Phone
);
