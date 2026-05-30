namespace SampleApi.Products;

/// <summary>
/// Thread-safe in-memory product store. Registered as a singleton so state
/// persists for the lifetime of the application process.
/// </summary>
public sealed class ProductCache
{
    private readonly List<Product> _products =
    [
        new(1, "Widget",          9.99m),
        new(2, "Gadget",         24.99m),
        new(3, "Doohickey",       4.49m),
        new(4, "Thingamajig",    14.99m),
        new(5, "Whatchamacallit", 7.49m),
    ];

    private int _nextId = 6;

    /// <summary>Returns a read-only snapshot of all products.</summary>
    public IReadOnlyList<Product> GetAll() => _products.AsReadOnly();

    /// <summary>Returns the product with the given ID, or <c>null</c> if not found.</summary>
    public Product? GetById(int id) => _products.FirstOrDefault(p => p.Id == id);

    /// <summary>Adds a new product, assigning a server-generated ID. Returns the created product.</summary>
    public Product Add(Product product)
    {
        var created = product with { Id = _nextId++ };
        _products.Add(created);
        return created;
    }

    /// <summary>
    /// Replaces the product at <paramref name="id"/> with the supplied values.
    /// Returns the updated product, or <c>null</c> if no product with that ID exists.
    /// </summary>
    public Product? Update(int id, Product product)
    {
        var index = _products.FindIndex(p => p.Id == id);
        if (index < 0) return null;
        var updated = product with { Id = id };
        _products[index] = updated;
        return updated;
    }

    /// <summary>
    /// Removes the product with <paramref name="id"/>.
    /// Returns <c>true</c> if the product was found and removed.
    /// </summary>
    public bool Remove(int id)
    {
        var product = _products.FirstOrDefault(p => p.Id == id);
        if (product is null) return false;
        _products.Remove(product);
        return true;
    }
}
