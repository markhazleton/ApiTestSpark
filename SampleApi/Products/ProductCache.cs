namespace SampleApi.Products;

/// <summary>
/// Thread-safe in-memory product store. Registered as a singleton so state
/// persists for the lifetime of the application process.
/// </summary>
public sealed class ProductCache
{
    private readonly List<Product> _products =
    [
        new(1,  "Widget",           9.99m,   "Tools",       "A versatile general-purpose widget suitable for most projects.",       142),
        new(2,  "Gadget",          24.99m,   "Electronics", "Compact electronic gadget with multiple connectivity options.",          58),
        new(3,  "Doohickey",        4.49m,   "Tools",       "Small but essential doohickey. Buy in bulk and save.",                 320),
        new(4,  "Thingamajig",     14.99m,   "Office",      "Desktop thingamajig that keeps your workspace organised.",              85),
        new(5,  "Whatchamacallit",  7.49m,   "Office",      "Nobody can remember the name but everyone needs one.",                 203),
        new(6,  "Gizmo Pro",       49.99m,   "Electronics", "Professional-grade gizmo with extended warranty and premium support.",   12),
        new(7,  "Super Sprocket",   3.29m,   "Tools",       "High-tensile steel sprocket, compatible with all standard fittings.",  500),
        new(8,  "Fancy Doodad",    19.95m,   "Office",      "Decorative and functional doodad for the modern office.",               67),
        new(9,  "Mega Widget",     34.99m,   "Tools",       "Heavy-duty version of the classic Widget. Twice the torque.",           29),
        new(10, "Nano Gadget",     12.49m,   "Electronics", "Ultra-compact version of the Gadget. Fits in your pocket.",            174),
    ];

    private int _nextId = 11;

    /// <summary>Returns a read-only snapshot of all products.</summary>
    public IReadOnlyList<Product> GetAll() => _products.AsReadOnly();

    /// <summary>Returns the product with the given ID, or <c>null</c> if not found.</summary>
    public Product? GetById(int id) => _products.FirstOrDefault(p => p.Id == id);

    /// <summary>Returns all distinct category names currently in the catalog.</summary>
    public IReadOnlyList<string> GetCategories() =>
        _products
            .Select(p => p.Category!)
            .Where(c => c is not null)
            .Distinct()
            .Order()
            .ToList()
            .AsReadOnly();

    /// <summary>Returns all products in the specified category (case-insensitive).</summary>
    public IReadOnlyList<Product> GetByCategory(string category) =>
        _products
            .Where(p => string.Equals(p.Category, category, StringComparison.OrdinalIgnoreCase))
            .ToList()
            .AsReadOnly();

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
