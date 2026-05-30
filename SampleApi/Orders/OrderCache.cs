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
        // Resolve seeded products by ID for consistent line-item snapshots
        var widget      = products.GetById(1)!;   // Widget           $9.99
        var gadget      = products.GetById(2)!;   // Gadget           $24.99
        var doohickey   = products.GetById(3)!;   // Doohickey        $4.49
        var thingamajig = products.GetById(4)!;   // Thingamajig      $14.99
        var watchama    = products.GetById(5)!;   // Whatchamacallit  $7.49
        var gizmoPro    = products.GetById(6)!;   // Gizmo Pro        $49.99
        var sprocket    = products.GetById(7)!;   // Super Sprocket   $3.29
        var doodad      = products.GetById(8)!;   // Fancy Doodad     $19.95
        var megaWidget  = products.GetById(9)!;   // Mega Widget      $34.99
        var nanoGadget  = products.GetById(10)!;  // Nano Gadget      $12.49

        var now = DateTime.UtcNow;

        // ── Customer 1 (Alice / Acme Corp) — two orders: one delivered, one confirmed ──
        Seed(1, OrderStatus.Delivered, now.AddDays(-14),
            Line(widget, 5), Line(doohickey, 10), Line(sprocket, 20));

        Seed(1, OrderStatus.Confirmed, now.AddDays(-2),
            Line(gadget, 1), Line(thingamajig, 2));

        // ── Customer 2 (Bob) — one shipped order ──
        Seed(2, OrderStatus.Shipped, now.AddDays(-5),
            Line(gizmoPro, 1), Line(nanoGadget, 2));

        // ── Customer 3 (Carol / White Consulting) — two orders: pending + cancelled ──
        Seed(3, OrderStatus.Pending, now.AddHours(-3),
            Line(watchama, 4), Line(doodad, 1));

        Seed(3, OrderStatus.Cancelled, now.AddDays(-7),
            Line(megaWidget, 1));

        // ── Customer 4 (David / Brown Industries) — one large delivered order ──
        Seed(4, OrderStatus.Delivered, now.AddDays(-21),
            Line(widget, 50), Line(sprocket, 100), Line(doohickey, 200));

        // ── Customer 5 (Eve) — one pending order (just placed) ──
        Seed(5, OrderStatus.Pending, now.AddMinutes(-15),
            Line(nanoGadget, 3), Line(watchama, 2), Line(doodad, 1));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static OrderLine Line(Products.Product p, int qty) =>
        new(p.Id, p.Name, qty, p.Price);

    private void Seed(int customerId, OrderStatus status, DateTime placedAt, params OrderLine[] lines)
    {
        _orders.Add(new Order(_nextId++, customerId, status, lines, placedAt));
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /// <summary>Returns a read-only snapshot of all orders, newest first.</summary>
    public IReadOnlyList<Order> GetAll() =>
        _orders.OrderByDescending(o => o.PlacedAt).ToList().AsReadOnly();

    /// <summary>Returns orders belonging to a specific customer, newest first.</summary>
    public IReadOnlyList<Order> GetByCustomer(int customerId) =>
        _orders
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.PlacedAt)
            .ToList()
            .AsReadOnly();

    /// <summary>Returns orders in the given status.</summary>
    public IReadOnlyList<Order> GetByStatus(OrderStatus status) =>
        _orders
            .Where(o => o.Status == status)
            .OrderByDescending(o => o.PlacedAt)
            .ToList()
            .AsReadOnly();

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
