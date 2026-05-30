namespace SampleApi.Products;

/// <summary>
/// Represents a product in the catalog.
/// </summary>
/// <param name="Id">Unique identifier assigned by the server.</param>
/// <param name="Name">Display name of the product.</param>
/// <param name="Price">Unit price in USD.</param>
public record Product(int Id, string Name, decimal Price);
