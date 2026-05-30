namespace SampleApi.Home;

/// <summary>
/// Registers the promotional home page route.
/// Called from Program.cs: <c>app.MapHome();</c>
/// </summary>
public static class HomeEndpoints
{
    public static WebApplication MapHome(this WebApplication app)
    {
        app.MapGet("/", Handler).ExcludeFromDescription();
        return app;
    }

    private static IResult Handler() => Results.Content(Html, "text/html; charset=utf-8");

    private const string Html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="description" content="API Test Spark — embed an interactive API test harness into any .NET 10 Minimal API project with one line of code." />
            <title>API Test Spark — Interactive API Test Harness for .NET</title>
            <style>
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a2e; background: #f8fafc; line-height: 1.6; }

                /* ── Nav ── */
                nav { background: #0f172a; color: #e2e8f0; padding: 0.75rem 2rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
                nav .brand { font-weight: 700; font-size: 1.1rem; color: #38bdf8; text-decoration: none; }
                nav .links { display: flex; gap: 1.5rem; }
                nav .links a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
                nav .links a:hover { color: #e2e8f0; }

                /* ── Hero ── */
                .hero { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0c4a6e 100%); color: white; padding: 5rem 2rem 4rem; text-align: center; }
                .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; margin-bottom: 1rem; line-height: 1.1; }
                .hero h1 span { color: #38bdf8; }
                .hero p { font-size: 1.2rem; color: #94a3b8; max-width: 600px; margin: 0 auto 2.5rem; }
                .hero-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
                .btn-primary { background: #0ea5e9; color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s, transform 0.1s; display: inline-block; }
                .btn-primary:hover { background: #0284c7; transform: translateY(-1px); }
                .btn-secondary { background: transparent; color: #e2e8f0; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem; border: 2px solid #334155; transition: border-color 0.2s; display: inline-block; }
                .btn-secondary:hover { border-color: #94a3b8; }

                /* ── Install strip ── */
                .install-strip { background: #020617; color: #e2e8f0; padding: 1.25rem 2rem; text-align: center; border-bottom: 1px solid #1e293b; }
                .install-strip p { font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; }
                .install-cmd { display: inline-flex; align-items: center; gap: 1rem; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 0.6rem 1.25rem; }
                .install-cmd code { font-family: 'Courier New', monospace; font-size: 1rem; color: #38bdf8; }
                .copy-btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }
                .copy-btn:hover { background: #334155; color: #e2e8f0; }

                /* ── Sections ── */
                .container { max-width: 960px; margin: 0 auto; padding: 0 2rem; }
                section { padding: 4rem 0; }
                section + section { border-top: 1px solid #e2e8f0; }
                h2 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a; }
                h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; color: #1e3a5f; }
                .section-intro { color: #475569; margin-bottom: 2rem; font-size: 1.05rem; }

                /* ── Steps ── */
                .steps { display: flex; flex-direction: column; gap: 2rem; }
                .step { display: grid; grid-template-columns: 3rem 1fr; gap: 1rem; align-items: start; }
                .step-num { width: 2.5rem; height: 2.5rem; background: #0ea5e9; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; margin-top: 0.15rem; }
                .step-body p { color: #475569; margin-top: 0.25rem; margin-bottom: 0.75rem; font-size: 0.95rem; }

                /* ── Code blocks ── */
                pre { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 1.25rem 1.5rem; overflow-x: auto; font-size: 0.88rem; line-height: 1.7; margin: 0; border: 1px solid #1e293b; }
                pre .c  { color: #64748b; }
                pre .kw { color: #7dd3fc; }
                pre .st { color: #86efac; }
                pre .ty { color: #fde68a; }
                pre .cm { color: #38bdf8; }
                code.inline { background: #e0f2fe; color: #0c4a6e; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.88em; font-family: 'Courier New', monospace; }

                /* ── Feature cards ── */
                .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
                .feature-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
                .feature-icon { font-size: 2rem; margin-bottom: 0.75rem; }
                .feature-card h3 { margin-bottom: 0.4rem; }
                .feature-card p { color: #64748b; font-size: 0.9rem; }

                /* ── Options table ── */
                .options-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                .options-table th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e2e8f0; }
                .options-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
                .options-table tr:last-child td { border-bottom: none; }
                .options-table td:first-child { font-family: 'Courier New', monospace; color: #0c4a6e; font-size: 0.85rem; white-space: nowrap; }
                .options-table td:nth-child(2) { color: #64748b; font-family: 'Courier New', monospace; font-size: 0.82rem; }
                .options-table td:nth-child(3) { color: #475569; }

                /* ── Demo section ── */
                .demo-box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
                .demo-box p { color: #475569; margin-bottom: 1.5rem; }
                .endpoint-list { text-align: left; display: inline-block; margin: 1.5rem 0; }
                .endpoint-list li { list-style: none; padding: 0.35rem 0; font-size: 0.9rem; color: #334155; }
                .method { display: inline-block; width: 4rem; font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; text-align: center; margin-right: 0.5rem; }
                .get    { background: #dbeafe; color: #1d4ed8; }
                .post   { background: #dcfce7; color: #15803d; }
                .put    { background: #fef9c3; color: #854d0e; }
                .delete { background: #fee2e2; color: #b91c1c; }

                /* ── NuGet badge area ── */
                .badges { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
                .badge { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.4rem 0.85rem; font-size: 0.82rem; color: #475569; display: flex; align-items: center; gap: 0.4rem; }
                .badge strong { color: #0f172a; }

                /* ── Footer ── */
                footer { background: #0f172a; color: #64748b; padding: 2rem; text-align: center; font-size: 0.85rem; }
                footer a { color: #38bdf8; text-decoration: none; }
                footer a:hover { text-decoration: underline; }
                footer .footer-links { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 0.75rem; }

                /* ── Responsive ── */
                @media (max-width: 600px) {
                    .step { grid-template-columns: 2.5rem 1fr; }
                    nav .links { gap: 1rem; }
                }
            </style>
        </head>
        <body>

        <nav>
            <a href="/" class="brand">⚡ API Test Spark</a>
            <div class="links">
                <a href="#quickstart">Quickstart</a>
                <a href="#features">Features</a>
                <a href="#options">Options</a>
                <a href="#demo">Live Demo</a>
                <a href="https://www.nuget.org/packages/ApiTestSpark" target="_blank" rel="noopener">NuGet</a>
                <a href="https://github.com/markhazleton/ApiTestSpark" target="_blank" rel="noopener">GitHub</a>
            </div>
        </nav>

        <div class="hero">
            <h1>Interactive API testing,<br /><span>one line of code</span></h1>
            <p>
                Embed a full-featured API test harness into any .NET 10 Minimal API project.
                Autodiscovers your OpenAPI v3 endpoints. No separate deployment required.
            </p>
            <div class="hero-actions">
                <a href="/api-test-spark/" class="btn-primary">⚡ Open Live Demo</a>
                <a href="#quickstart" class="btn-secondary">Get Started →</a>
            </div>
        </div>

        <div class="install-strip">
            <p>Install from NuGet</p>
            <div class="install-cmd">
                <code id="install-cmd-text">dotnet add package ApiTestSpark</code>
                <button class="copy-btn" onclick="copyInstall()">Copy</button>
            </div>
        </div>

        <div class="container">

            <!-- ── Features ── -->
            <section id="features">
                <h2>Everything you need to test your API</h2>
                <p class="section-intro">
                    API Test Spark embeds a React-powered test harness directly into your .NET application.
                    No extra services, no configuration files, no separate deployments.
                </p>
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-icon">🔍</div>
                        <h3>OpenAPI Autodiscovery</h3>
                        <p>Points at your OpenAPI v3 document and renders every endpoint instantly. Works with .NET's built-in <code class="inline">MapOpenApi()</code>.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📦</div>
                        <h3>Single NuGet Package</h3>
                        <p>The entire React SPA is embedded as resources inside the package. No <code class="inline">wwwroot</code> copying, no CDN, no build step required in your app.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔐</div>
                        <h3>Auth &amp; Header Injection</h3>
                        <p>Pre-populate Bearer tokens, API keys, or custom headers for every request. Supports Bearer, ApiKey, and Basic schemes.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🐛</div>
                        <h3>Live Debug Panel</h3>
                        <p>Inspect every request, response, and error in real time. Performance metrics tracked per call. FIFO history buffer keeps memory bounded.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🌍</div>
                        <h3>Multi-Environment</h3>
                        <p>Switch between localhost, staging, and custom endpoints without changing code. Config persisted in localStorage per environment.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔒</div>
                        <h3>Environment Gating</h3>
                        <p>Restrict the harness to specific environments such as Development or Staging. One option keeps the harness out of production entirely.</p>
                    </div>
                </div>
            </section>

            <!-- ── Quickstart ── -->
            <section id="quickstart">
                <h2>Quickstart</h2>
                <p class="section-intro">From zero to a running test harness in under five minutes.</p>
                <div class="steps">

                    <div class="step">
                        <div class="step-num">1</div>
                        <div class="step-body">
                            <h3>Install the NuGet package</h3>
                            <p>Run this in your project directory or use the NuGet Package Manager.</p>
                            <pre>dotnet add package ApiTestSpark</pre>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-num">2</div>
                        <div class="step-body">
                            <h3>Add OpenAPI support (if not already present)</h3>
                            <p>.NET 9+ includes OpenAPI support built-in. Add it to the service container and map the document endpoint.</p>
<pre><span class="kw">var</span> builder = WebApplication.CreateBuilder(args);
builder.Services.<span class="cm">AddOpenApi</span>();          <span class="c">// built-in .NET 9+</span>

<span class="kw">var</span> app = builder.Build();
app.<span class="cm">MapOpenApi</span>();                        <span class="c">// serves at /openapi/v1.json</span></pre>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-num">3</div>
                        <div class="step-body">
                            <h3>Register the harness with one line</h3>
                            <p>Call <code class="inline">MapApiTestSpark()</code> after building the app. That's all that's required.</p>
<pre>app.<span class="cm">MapApiTestSpark</span>();</pre>
                            <p>The harness is now live at <code class="inline">https://localhost:{port}/api-test-spark/</code></p>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-num">4</div>
                        <div class="step-body">
                            <h3>Full minimal Program.cs</h3>
                            <p>A complete working example — copy, paste, run.</p>
<pre><span class="kw">using</span> ApiTestSpark;

<span class="kw">var</span> builder = WebApplication.CreateBuilder(args);
builder.Services.<span class="cm">AddOpenApi</span>();

<span class="kw">var</span> app = builder.Build();
app.<span class="cm">MapOpenApi</span>();

app.<span class="cm">MapGet</span>(<span class="st">"/products"</span>, () => <span class="kw">new</span>[] {
    <span class="kw">new</span> { Id = 1, Name = <span class="st">"Widget"</span>, Price = 9.99 }
}).<span class="cm">WithSummary</span>(<span class="st">"List all products"</span>);

app.<span class="cm">MapApiTestSpark</span>(options =>
{
    options.OpenApiUrl = <span class="st">"/openapi/v1.json"</span>;
    options.Environments = [<span class="st">"Development"</span>];
});

app.<span class="cm">Run</span>();</pre>
                        </div>
                    </div>

                </div>
            </section>

            <!-- ── Configuration options ── -->
            <section id="options">
                <h2>Configuration options</h2>
                <p class="section-intro">
                    All options are set via the <code class="inline">Action&lt;ApiTestSparkOptions&gt;</code> delegate passed to <code class="inline">MapApiTestSpark()</code>.
                    Every property has a sensible default — only set what you need.
                </p>
                <table class="options-table">
                    <thead>
                        <tr>
                            <th>Property</th>
                            <th>Default</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>OpenApiUrl</td>
                            <td>"/openapi.json"</td>
                            <td>Relative or absolute URL to your OpenAPI v3 JSON document. The SPA fetches this on startup to discover endpoints. Set to <code class="inline">null</code> to disable autodiscovery.</td>
                        </tr>
                        <tr>
                            <td>AuthScheme</td>
                            <td>null</td>
                            <td>Advertises the auth scheme to the SPA UI (<code class="inline">"Bearer"</code>, <code class="inline">"ApiKey"</code>, or <code class="inline">"Basic"</code>). Pre-populates the auth field. Never a token value.</td>
                        </tr>
                        <tr>
                            <td>DefaultHeaders</td>
                            <td>{}</td>
                            <td>Key-value headers injected into every request the SPA makes to your API. Use for tenant IDs, correlation headers, etc. Must not contain secrets — values are served via the public config endpoint.</td>
                        </tr>
                        <tr>
                            <td>Environments</td>
                            <td>[] (all)</td>
                            <td>Environment names where the harness is active. Empty array enables it everywhere. Example: <code class="inline">["Development", "Staging"]</code> keeps it off production.</td>
                        </tr>
                        <tr>
                            <td>CorsOrigins</td>
                            <td>[] (same-origin)</td>
                            <td>Extra origins allowed to call the config endpoint. Use when the Vite dev server and your .NET API run on different ports, e.g. <code class="inline">["http://localhost:5151"]</code>.</td>
                        </tr>
                        <tr>
                            <td>EnableVerboseLogging</td>
                            <td>false</td>
                            <td>Emits <code class="inline">ILogger.LogDebug</code> for every static asset served and every SPA fallback. Alternatively set <code class="inline">Logging:LogLevel:ApiTestSpark=Debug</code> in appsettings without redeploying.</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 2rem;">
                    <h3>Example — auth, custom headers, and environment gating</h3>
<pre style="margin-top:0.75rem"><span class="kw">app</span>.<span class="cm">MapApiTestSpark</span>(options =>
{
    options.OpenApiUrl   = <span class="st">"/openapi/v1.json"</span>;
    options.AuthScheme   = <span class="st">"Bearer"</span>;
    options.DefaultHeaders[<span class="st">"X-Tenant-Id"</span>] = <span class="st">"acme"</span>;
    options.Environments = [<span class="st">"Development"</span>, <span class="st">"Staging"</span>];
});</pre>
                </div>

                <div style="margin-top: 2rem;">
                    <h3>Example — behind a reverse proxy</h3>
                    <p style="color:#475569;font-size:0.95rem;margin:0.5rem 0 0.75rem">Call <code class="inline">UseForwardedHeaders()</code> before <code class="inline">MapApiTestSpark()</code> so the config endpoint reports the correct public base URL.</p>
<pre>app.<span class="cm">UseForwardedHeaders</span>();
app.<span class="cm">MapApiTestSpark</span>();</pre>
                </div>
            </section>

            <!-- ── Live demo ── -->
            <section id="demo">
                <h2>Live demo</h2>
                <p class="section-intro">
                    This page is the live demonstration. The Products API below is the host application.
                    API Test Spark is already installed and running — click the button to open it.
                </p>
                <div class="demo-box">
                    <p>
                        The harness has autodiscovered the Products API on this page via its OpenAPI document.
                        Open it to browse endpoints, fire requests, and inspect responses in the debug panel.
                    </p>
                    <a href="/api-test-spark/" class="btn-primary" style="font-size:1.05rem;padding:1rem 2.5rem;">⚡ Open API Test Spark</a>
                    <ul class="endpoint-list">
                        <li><span class="method get">GET</span><code>/products</code> — list all products</li>
                        <li><span class="method get">GET</span><code>/products/{id}</code> — get product by ID</li>
                        <li><span class="method post">POST</span><code>/products</code> — create a product</li>
                        <li><span class="method put">PUT</span><code>/products/{id}</code> — update a product</li>
                        <li><span class="method delete">DELETE</span><code>/products/{id}</code> — delete a product</li>
                        <li><span class="method get">GET</span><code>/openapi/v1.json</code> — OpenAPI document</li>
                    </ul>
                    <div class="badges" style="justify-content:center;margin-top:1.5rem;">
                        <div class="badge">⚡ <strong>Running</strong> .NET 10 Minimal API</div>
                        <div class="badge">📖 <strong>OpenAPI v3</strong> autodiscovery active</div>
                        <div class="badge">📦 <strong>ApiTestSpark</strong> NuGet package</div>
                    </div>
                </div>
            </section>

            <!-- ── How it works ── -->
            <section id="how-it-works">
                <h2>How it works</h2>
                <p class="section-intro">
                    API Test Spark compiles the React SPA into embedded resources inside the NuGet package.
                    When you call <code class="inline">MapApiTestSpark()</code>, the library registers two things into your ASP.NET Core pipeline:
                </p>
                <div class="steps">
                    <div class="step">
                        <div class="step-num">①</div>
                        <div class="step-body">
                            <h3>Static file middleware</h3>
                            <p>Serves the embedded SPA assets (HTML, JS, CSS, icons) at <code class="inline">/api-test-spark/</code> using <code class="inline">EmbeddedFileProvider</code>. No files are copied to your project. No <code class="inline">wwwroot</code> changes.</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-num">②</div>
                        <div class="step-body">
                            <h3>Config endpoint</h3>
                            <p>Registers <code class="inline">GET /api-test-spark/config</code> as a Minimal API endpoint. The SPA fetches this on startup to receive your <code class="inline">OpenApiUrl</code>, <code class="inline">AuthScheme</code>, and <code class="inline">DefaultHeaders</code> — no hardcoded values in the bundle.</p>
                            <pre style="margin-top:0.5rem">{
  "baseUrl": "https://your-api.example.com",
  "openApiUrl": "/openapi/v1.json",
  "authScheme": "Bearer",
  "defaultHeaders": { "X-Tenant-Id": "acme" }
}</pre>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-num">③</div>
                        <div class="step-body">
                            <h3>SPA fallback middleware</h3>
                            <p>Extensionless paths under <code class="inline">/api-test-spark/</code> fall back to <code class="inline">index.html</code> so client-side routing works. Requests for unknown file extensions return HTTP 404 — the SPA never silently swallows asset 404s.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── FAQ ── -->
            <section id="faq">
                <h2>Frequently asked questions</h2>
                <div style="display:flex;flex-direction:column;gap:1.5rem;margin-top:0.5rem;">
                    <div>
                        <h3>Does it work on .NET 8 or 9?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">The package targets <code class="inline">net10.0</code>. For earlier targets, reference the package source directly and adjust the target framework in the <code class="inline">.csproj</code>. OpenAPI support is built-in from .NET 9 onwards; for .NET 8 use <a href="https://www.nuget.org/packages/Swashbuckle.AspNetCore" style="color:#0ea5e9;">Swashbuckle</a> and point <code class="inline">OpenApiUrl</code> at your Swagger JSON URL.</p>
                    </div>
                    <div>
                        <h3>Is it safe to leave enabled in production?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">The config endpoint is publicly accessible and returns metadata (auth scheme, header names) — never token values. For production we recommend using <code class="inline">Environments = ["Development", "Staging"]</code> or adding network-level access controls (e.g. IP allowlist on your reverse proxy) to restrict access.</p>
                    </div>
                    <div>
                        <h3>Will it conflict with other middleware?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">The harness is scoped to <code class="inline">/api-test-spark/</code>. It does not affect any other routes or middleware. If you have a WAF or CDN, note that all extensionless paths under <code class="inline">/api-test-spark/</code> return HTTP 200 — the React router handles 404s client-side.</p>
                    </div>
                    <div>
                        <h3>How do I add the harness only in Development without an environment check in code?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">Set <code class="inline">options.Environments = ["Development"]</code>. The library checks <code class="inline">IHostEnvironment.EnvironmentName</code> at startup and skips registration if the current environment is not in the list.</p>
                    </div>
                    <div>
                        <h3>Does it support OpenAPI v2 / Swagger 2.0?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">Not in the current release. Only OpenAPI v3.x documents are parsed. Support for v2 is on the roadmap.</p>
                    </div>
                </div>
            </section>

        </div><!-- /container -->

        <footer>
            <div class="footer-links">
                <a href="https://apitest.makeboldspark.com">API Test Spark</a>
                <a href="https://www.nuget.org/packages/ApiTestSpark" target="_blank" rel="noopener">NuGet Package</a>
                <a href="https://github.com/markhazleton/ApiTestSpark" target="_blank" rel="noopener">GitHub</a>
                <a href="https://makeboldspark.com" target="_blank" rel="noopener">Make Bold Spark</a>
                <a href="https://makeboldsolutions.com" target="_blank" rel="noopener">Make Bold Solutions</a>
            </div>
            <p>
                Built by <a href="https://markhazleton.com">Mark Hazleton</a> —
                <a href="https://makeboldsolutions.com">Make Bold Solutions</a>
            </p>
        </footer>

        <script>
            function copyInstall() {
                navigator.clipboard.writeText('dotnet add package ApiTestSpark')
                    .then(() => {
                        const btn = document.querySelector('.copy-btn');
                        btn.textContent = 'Copied!';
                        setTimeout(() => btn.textContent = 'Copy', 2000);
                    });
            }
        </script>

        </body>
        </html>
""";
}
