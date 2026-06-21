using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using SampleApi.Customers;
using SampleApi.Orders;
using SampleApi.Products;
using System.Text.Json;

namespace SampleApi.OpenApi;

internal static class OpenApiExtensions
{
    private const string TagProducts  = "Products: Catalog";
    private const string TagCustomers = "Customers: Accounts";
    private const string TagOrders    = "Orders: Lifecycle";

    internal static void AddSampleApiDocumentation(this OpenApiOptions options)
    {
        options.AddDocumentTransformer((document, _, _) =>
        {
            // ── Info ──────────────────────────────────────────────────────────
            document.Info = new OpenApiInfo
            {
                Title       = "API Test Spark — Demo API",
                Version     = "v1",
                Description = """
                    Demonstration REST API for ApiTestSpark — showcasing OpenAPI autodiscovery,
                    accordion endpoint grouping, request body scaffolding, and response rendering.

                    ## Resource Groups

                    | Group | Tag | Endpoints |
                    |---|---|---|
                    | Products: Catalog | catalog browsing + CRUD | 7 |
                    | Customers: Accounts | customer account CRUD | 5 |
                    | Orders: Lifecycle | order placement + status management | 7 |

                    ## Seed Data

                    All data is held **in memory** and resets when the process restarts.
                    Pre-loaded on startup: **10 products** (3 categories), **5 customers** (with addresses),
                    **7 orders** (all status values represented).

                    ## Full Workflow Demo

                    1. `GET /customers` — browse seeded customers
                    2. `POST /customers` — create a new customer (note the returned `id`)
                    3. `POST /products` — create a new product (note the returned `id`)
                    4. `POST /orders` — place an order using those ids
                    5. `PATCH /orders/{id}/status?status=Confirmed` — advance the order
                    6. `GET /orders/customer/{customerId}` — see all orders for your customer

                    ## Conventions

                    - All timestamps are **UTC** ISO 8601 (e.g. `2025-06-15T14:30:00Z`).
                    - All monetary values are **USD** decimals rounded to two places.
                    - Error responses follow **RFC 7807** Problem Details (`application/problem+json`).
                    - Integer IDs are server-assigned; supply `0` on create requests.
                    - Enum values are serialised as **strings** (e.g. `"Confirmed"`, not `1`).
                    """,
                Contact = new OpenApiContact
                {
                    Name  = "Mark Hazleton",
                    Url   = new Uri("https://markhazleton.com"),
                    Email = "mark@markhazleton.com",
                },
                License = new OpenApiLicense
                {
                    Name = "MIT",
                    Url  = new Uri("https://opensource.org/licenses/MIT"),
                },
                TermsOfService = new Uri("https://markhazleton.com"),
            };

            // ── Servers ───────────────────────────────────────────────────────
            document.Servers =
            [
                new OpenApiServer
                {
                    Url         = "http://localhost:5200",
                    Description = "Local development server",
                },
                new OpenApiServer
                {
                    Url         = "https://apitest.makeboldspark.com",
                    Description = "Public demo server",
                },
            ];

            // ── External docs ─────────────────────────────────────────────────
            document.ExternalDocs = new OpenApiExternalDocs
            {
                Description = "ApiTestSpark on GitHub",
                Url         = new Uri("https://github.com/markhazleton/ApiTestSpark"),
            };

            // ── Tag objects ───────────────────────────────────────────────────
            document.Tags = new HashSet<OpenApiTag>
            {
                new OpenApiTag
                {
                    Name        = TagProducts,
                    Description = """
                        CRUD operations for the product catalog.

                        Products carry a **Name**, unit **Price** (USD), optional **Category**,
                        **Description**, and **StockQuantity**. The server assigns the integer **Id**
                        on create; supply `0` in the request body.

                        ### Seeded catalog (10 products, 3 categories)

                        | Id | Name | Category | Price | Stock |
                        |----|------|----------|-------|-------|
                        | 1 | Widget | Tools | $9.99 | 100 |
                        | 2 | Gadget | Electronics | $24.99 | 50 |
                        | 3 | Doohickey | Tools | $4.99 | 200 |
                        | 4 | Thingamajig | Office | $14.99 | 75 |
                        | 5 | Whatsit | Electronics | $49.99 | 30 |
                        | 6 | Gizmo Pro | Electronics | $99.99 | 15 |
                        | 7 | Super Widget | Tools | $19.99 | 80 |
                        | 8 | Mega Gadget | Electronics | $149.99 | 10 |
                        | 9 | Office Starter Kit | Office | $29.99 | 60 |
                        | 10 | Desk Organizer | Office | $12.99 | 120 |

                        ### Validation rules

                        - `name` — required, 1–100 characters
                        - `price` — required, $0.01–$99,999.99
                        - `category` — optional, max 50 characters
                        - `description` — optional, max 500 characters
                        - `stockQuantity` — optional, ≥ 0 (defaults to `0`)
                        """,
                    ExternalDocs = new OpenApiExternalDocs
                    {
                        Description = "Product catalog documentation",
                        Url         = new Uri("https://github.com/markhazleton/ApiTestSpark#products"),
                    },
                },
                new OpenApiTag
                {
                    Name        = TagCustomers,
                    Description = """
                        CRUD operations for customer accounts.

                        Each customer has a **Name**, **Email**, optional **Phone**, **Company**, and
                        a nested **Address** (street, city, state, postal code, ISO-3166-1 alpha-2
                        country). The server assigns the integer **Id** on create.

                        ### Seeded accounts (5 customers)

                        | Id | Name | Company | City, State |
                        |----|------|---------|-------------|
                        | 1 | Alice Johnson | Acme Corp | Springfield, IL |
                        | 2 | Bob Smith | *(none)* | Shelbyville, IL |
                        | 3 | Carol White | White Consulting | Capital City, IL |
                        | 4 | David Brown | Brown Industries | Ogdenville, OR |
                        | 5 | Eve Martinez | *(none)* | North Haverbrook, OR |

                        ### Validation rules

                        - `name` — required, 1–150 characters
                        - `email` — required, valid RFC 5322 format, max 254 characters
                        - `phone` — optional, max 30 characters
                        - `company` — optional, max 150 characters
                        - `address.country` — defaults to `US` (ISO 3166-1 alpha-2, max 2 chars)
                        """,
                    ExternalDocs = new OpenApiExternalDocs
                    {
                        Description = "Customer account documentation",
                        Url         = new Uri("https://github.com/markhazleton/ApiTestSpark#customers"),
                    },
                },
                new OpenApiTag
                {
                    Name        = TagOrders,
                    Description = """
                        Order lifecycle management — place, view, advance status, or cancel orders.

                        Orders reference an existing **Customer** and one or more **Products**.
                        Product name and unit price are **snapshotted** at placement time, so
                        catalog edits do not retroactively alter historical orders. The computed
                        **Total** and per-line **LineTotal** are derived, never stored.

                        ### Status lifecycle

                        ```
                        Pending → Confirmed → Shipped → Delivered
                              ↘          ↘         ↘
                           Cancelled   Cancelled   Cancelled
                        ```

                        Use `PATCH /orders/{id}/status?status=<value>` to advance or cancel.

                        ### Seeded orders (7 orders, all statuses represented)

                        | Id | Customer | Status | Lines |
                        |----|----------|--------|-------|
                        | 1 | Alice (1) | Delivered | Widget ×2, Doohickey ×1 |
                        | 2 | Bob (2) | Shipped | Gadget ×1 |
                        | 3 | Carol (3) | Confirmed | Thingamajig ×3 |
                        | 4 | Alice (1) | Pending | Whatsit ×1 |
                        | 5 | David (4) | Delivered | Gizmo Pro ×1, Super Widget ×2 |
                        | 6 | Carol (3) | Pending | Office Starter Kit ×1 |
                        | 7 | Eve (5) | Cancelled | Desk Organizer ×2 |

                        ### Validation rules

                        - `customerId` — must reference an existing customer
                        - `lines` — at least one line item required
                        - `lines[*].productId` — must reference an existing product
                        - `lines[*].quantity` — 1–10,000
                        """,
                    ExternalDocs = new OpenApiExternalDocs
                    {
                        Description = "Order lifecycle documentation",
                        Url         = new Uri("https://github.com/markhazleton/ApiTestSpark#orders"),
                    },
                },
            };

            return Task.CompletedTask;
        });

        // ── Schema transformer — add examples to key types ────────────────────
        options.AddSchemaTransformer((schema, context, _) =>
        {
            var type = context.JsonTypeInfo.Type;

            if (type == typeof(Product))
            {
                schema.Example = JsonSerializer.SerializeToNode(new
                {
                    id            = 2,
                    name          = "Gadget",
                    price         = 24.99,
                    category      = "Electronics",
                    description   = "A compact electronic gadget with a rechargeable battery.",
                    stockQuantity = 50,
                });
            }
            else if (type == typeof(Customer))
            {
                schema.Example = JsonSerializer.SerializeToNode(new
                {
                    id      = 1,
                    name    = "Alice Johnson",
                    email   = "alice@acmecorp.example",
                    phone   = "555-0101",
                    company = "Acme Corp",
                    address = new
                    {
                        street     = "123 Main St",
                        city       = "Springfield",
                        state      = "IL",
                        postalCode = "62701",
                        country    = "US",
                    },
                });
            }
            else if (type == typeof(Address))
            {
                schema.Example = JsonSerializer.SerializeToNode(new
                {
                    street     = "123 Main St",
                    city       = "Springfield",
                    state      = "IL",
                    postalCode = "62701",
                    country    = "US",
                });
            }
            else if (type == typeof(Order))
            {
                schema.Example = JsonSerializer.SerializeToNode(new
                {
                    id         = 1,
                    customerId = 1,
                    status     = "Delivered",
                    lines      = new[]
                    {
                        new { productId = 1, productName = "Widget",    quantity = 2, unitPrice = 9.99,  lineTotal = 19.98 },
                        new { productId = 3, productName = "Doohickey", quantity = 1, unitPrice = 4.99,  lineTotal = 4.99  },
                    },
                    placedAt = "2025-01-15T10:30:00Z",
                    total    = 24.97,
                });
            }
            else if (type == typeof(OrderLine))
            {
                schema.Example = JsonSerializer.SerializeToNode(new
                {
                    productId   = 1,
                    productName = "Widget",
                    quantity    = 2,
                    unitPrice   = 9.99,
                    lineTotal   = 19.98,
                });
            }
            else if (type == typeof(CreateOrderRequest))
            {
                schema.Example = JsonSerializer.SerializeToNode(new
                {
                    customerId = 1,
                    lines      = new[]
                    {
                        new { productId = 1, quantity = 2 },
                        new { productId = 3, quantity = 1 },
                    },
                });
            }
            else if (type == typeof(OrderLineRequest))
            {
                schema.Example = JsonSerializer.SerializeToNode(new
                {
                    productId = 1,
                    quantity  = 2,
                });
            }

            return Task.CompletedTask;
        });
    }
}

