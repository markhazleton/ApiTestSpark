using SampleApi.Products;

namespace SampleApi.Orders;

/// <summary>
/// Thread-safe in-memory order store. Registered as a singleton so state
/// persists for the lifetime of the application process.
/// </summary>
public sealed class OrderCache
{
    private readonly List<Order> _orders = [];
    private int _nextId = 1;

    public OrderCache(ProductCache products)
    {
        // Seed a few realistic orders using the seeded product data
        var widget      = products.GetById(1)!;  // Widget        $9.99
        var gadget      = products.GetById(2)!;  // Gadget        $24.99
        var doohickey   = products.GetById(3)!;  // Doohickey     $4.49
        var thingamajig = products.GetById(4)!;  // Thingamajig   $14.99

        var now = DateTime.UtcNow;

        _orders.AddRange([
            new Order(_nextId++, 1, OrderStatus.Delivered,
                [new(widget.Id,      widget.Name,      2, widget.Price),
                 new(doohickey.Id,   doohickey.Name,   1, doohickey.Price)],
                now.AddDays(-10)),

            new Order(_nextId++, 2, OrderStatus.Shipped,
                [new(gadget.Id,      gadget.Name,      1, gadget.Price)],
                now.AddDays(-3)),

            new Order(_nextId++, 1, OrderStatus.Confirmed,
                [new(thingamajig.Id, thingamajig.Name, 3, thingamajig.Price),
                 new(widget.Id,      widget.Name,      1, widget.Price)],
                now.AddDays(-1)),

            new Order(_nextId++, 3, OrderStatus.Pending,
                [new(doohickey.Id,   doohickey.Name,   5, doohickey.Price)],
                now.AddHours(-2)),
        ]);
    }

    /// <summary>Returns a read-only snapshot of all orders.</summary>
    public IReadOnlyList<Order> GetAll() => _orders.AsReadOnly();

    /// <summary>Returns orders belonging to a specific customer.</summary>
    public IReadOnlyList<Order> GetByCustomer(int customerId) =>
        _orders.Where(o => o.CustomerId == customerId).ToList().AsReadOnly();

    /// <summary>Returns the order with the given ID, or <c>null</c> if not found.</summary>
    public Order? GetById(int id) => _orders.FirstOrDefault(o => o.Id == id);

    /// <summary>Creates a new order from a validated request. Returns the created order.</summary>
    public Order Add(Order order)
    {
        var created = order with { Id = _nextId++ };
        _orders.Add(created);
        return created;
    }

    /// <summary>
    /// Advances or changes an order's status.
    /// Returns the updated order, or <c>null</c> if the order does not exist.
    /// </summary>
    public Order? UpdateStatus(int id, OrderStatus status)
    {
        var index = _orders.FindIndex(o => o.Id == id);
        if (index < 0) return null;
        var updated = _orders[index] with { Status = status };
        _orders[index] = updated;
        return updated;
    }

    /// <summary>
    /// Cancels the order with <paramref name="id"/> by setting its status to Cancelled.
    /// Returns <c>true</c> if found, <c>false</c> if not found.
    /// </summary>
    public bool Cancel(int id)
    {
        var updated = UpdateStatus(id, OrderStatus.Cancelled);
        return updated is not null;
    }
}
