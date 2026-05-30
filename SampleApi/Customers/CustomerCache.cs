namespace SampleApi.Customers;

/// <summary>
/// Thread-safe in-memory customer store. Registered as a singleton so state
/// persists for the lifetime of the application process.
/// </summary>
public sealed class CustomerCache
{
    private readonly List<Customer> _customers =
    [
        new(1, "Alice Johnson",  "alice@example.com",  "555-0101", "Acme Corp",
            new("123 Main St",   "Springfield", "IL", "62701", "US")),

        new(2, "Bob Smith",      "bob@example.com",    "555-0102", null,
            new("456 Oak Ave",   "Shelbyville", "IL", "62565", "US")),

        new(3, "Carol White",    "carol@example.com",  null,       "White Consulting",
            new("789 Elm Rd",    "Capital City", "IL", "62702", "US")),

        new(4, "David Brown",    "david@example.com",  "555-0104", "Brown Industries",
            new("321 Pine Blvd", "Ogdenville",   "OR", "97401", "US")),

        new(5, "Eve Martinez",   "eve@example.com",    "555-0105", null,
            new("654 Cedar Ln",  "North Haverbrook", "OR", "97402", "US")),
    ];

    private int _nextId = 6;

    /// <summary>Returns a read-only snapshot of all customers.</summary>
    public IReadOnlyList<Customer> GetAll() => _customers.AsReadOnly();

    /// <summary>Returns the customer with the given ID, or <c>null</c> if not found.</summary>
    public Customer? GetById(int id) => _customers.FirstOrDefault(c => c.Id == id);

    /// <summary>Adds a new customer, assigning a server-generated ID. Returns the created customer.</summary>
    public Customer Add(Customer customer)
    {
        var created = customer with { Id = _nextId++ };
        _customers.Add(created);
        return created;
    }

    /// <summary>
    /// Replaces the customer at <paramref name="id"/> with the supplied values.
    /// Returns the updated customer, or <c>null</c> if no customer with that ID exists.
    /// </summary>
    public Customer? Update(int id, Customer customer)
    {
        var index = _customers.FindIndex(c => c.Id == id);
        if (index < 0) return null;
        var updated = customer with { Id = id };
        _customers[index] = updated;
        return updated;
    }

    /// <summary>
    /// Removes the customer with <paramref name="id"/>.
    /// Returns <c>true</c> if the customer was found and removed.
    /// </summary>
    public bool Remove(int id)
    {
        var customer = _customers.FirstOrDefault(c => c.Id == id);
        if (customer is null) return false;
        _customers.Remove(customer);
        return true;
    }
}
