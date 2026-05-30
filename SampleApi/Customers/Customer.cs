using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace SampleApi.Customers;

/// <summary>A mailing / shipping address.</summary>
public record Address(
    [property: Description("Street line 1.")]
    [property: Required][property: MaxLength(200)]
    string Street,

    [property: Description("City name.")]
    [property: Required][property: MaxLength(100)]
    string City,

    [property: Description("State or province code (2 chars for US).")]
    [property: MaxLength(50)]
    string? State,

    [property: Description("Postal / ZIP code.")]
    [property: MaxLength(20)]
    string? PostalCode,

    [property: Description("ISO 3166-1 alpha-2 country code.")]
    [property: MaxLength(2)]
    string Country = "US"
);

/// <summary>A customer account.</summary>
public record Customer(
    [property: Description("Server-assigned unique identifier. Ignored on create.")]
    int Id,

    [property: Description("Full legal name of the customer.")]
    [property: Required][property: MinLength(1)][property: MaxLength(150)]
    string Name,

    [property: Description("Contact email address. Must be a valid email format.")]
    [property: Required][property: EmailAddress][property: MaxLength(254)]
    string Email,

    [property: Description("Optional contact phone number.")]
    [property: Phone][property: MaxLength(30)]
    string? Phone,

    [property: Description("Optional company or organisation name.")]
    [property: MaxLength(150)]
    string? Company,

    [property: Description("Primary shipping/billing address. Optional.")]
    Address? Address
);
