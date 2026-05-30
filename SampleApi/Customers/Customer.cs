namespace SampleApi.Customers;

/// <summary>Represents a customer account.</summary>
/// <param name="Id">Unique identifier assigned by the server.</param>
/// <param name="Name">Full name of the customer.</param>
/// <param name="Email">Contact email address.</param>
/// <param name="Phone">Optional phone number.</param>
public record Customer(int Id, string Name, string Email, string? Phone);
