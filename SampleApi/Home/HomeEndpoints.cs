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

                /* ── Package metadata card ── */
                .pkg-card { background: white; border: 2px solid #0ea5e9; border-radius: 16px; padding: 2rem 2.5rem; box-shadow: 0 4px 24px rgba(14,165,233,0.10); margin-bottom: 2rem; }
                .pkg-header { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
                .pkg-icon { font-size: 2.5rem; line-height: 1; }
                .pkg-title { flex: 1 1 auto; }
                .pkg-title h2 { font-size: 1.6rem; margin-bottom: 0.15rem; color: #0f172a; }
                .pkg-title .pkg-version { display: inline-block; background: #0ea5e9; color: white; border-radius: 6px; padding: 0.2rem 0.75rem; font-size: 0.82rem; font-weight: 700; letter-spacing: .03em; margin-bottom: 0.25rem; }
                .pkg-title p { color: #475569; font-size: 0.95rem; margin-top: 0.3rem; }
                .pkg-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                .pkg-meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; }
                .pkg-meta-item .label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; margin-bottom: 0.2rem; }
                .pkg-meta-item .value { font-size: 0.95rem; font-weight: 600; color: #0f172a; }
                .pkg-meta-item .value a { color: #0ea5e9; text-decoration: none; }
                .pkg-meta-item .value a:hover { text-decoration: underline; }
                .pkg-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
                .pkg-tag-list { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 1rem; }
                .pkg-tag { background: #e0f2fe; color: #0369a1; border-radius: 4px; padding: 0.15rem 0.5rem; font-size: 0.75rem; font-family: 'Courier New', monospace; }

                /* ── Best-practices section ── */
                .bp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
                .bp-card { background: white; border: 1px solid #e2e8f0; border-left: 4px solid #0ea5e9; border-radius: 8px; padding: 1.25rem 1.5rem; }
                .bp-card h3 { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.35rem; }
                .bp-card p { color: #475569; font-size: 0.88rem; margin-bottom: 0.6rem; }
                .bp-card ul { margin: 0; padding-left: 1.1rem; color: #475569; font-size: 0.88rem; }
                .bp-card ul li { margin-bottom: 0.2rem; }
                .bp-card.gold { border-left-color: #f59e0b; }
                .bp-card.green { border-left-color: #10b981; }
                .bp-card.purple { border-left-color: #8b5cf6; }
                .bp-card.red { border-left-color: #ef4444; }
                .impact-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 1.25rem; }
                .impact-table th { background: #f1f5f9; padding: 0.65rem 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e2e8f0; }
                .impact-table td { padding: 0.65rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
                .impact-table tr:last-child td { border-bottom: none; }
                .impact-table td:first-child { font-family: 'Courier New', monospace; color: #0c4a6e; font-size: 0.82rem; white-space: nowrap; }
                .impact-table td:nth-child(2) { color: #475569; }
                .pill { display: inline-block; border-radius: 999px; padding: 0.1rem 0.6rem; font-size: 0.72rem; font-weight: 700; }
                .pill-high { background: #dcfce7; color: #15803d; }
                .pill-med  { background: #fef9c3; color: #854d0e; }
                .pill-low  { background: #f1f5f9; color: #64748b; }
                .diff-block { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
                .diff-block pre { margin: 0; }
                .diff-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 0.3rem; }
                .diff-label.bad  { color: #ef4444; }
                .diff-label.good { color: #10b981; }
                @media (max-width: 700px) { .diff-block { grid-template-columns: 1fr; } }

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
                <a href="#best-practices">Best Practices</a>
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

            <!-- ── NuGet Package Card ── -->
            <section id="package" style="padding-top:3rem;padding-bottom:1rem;">
                <div class="pkg-card">
                    <div class="pkg-header">
                        <div class="pkg-icon">📦</div>
                        <div class="pkg-title">
                            <span class="pkg-version">v1.1.0</span>
                            <h2>ApiTestSpark</h2>
                            <p>MIT license &nbsp;·&nbsp; net10.0 &nbsp;·&nbsp; 181 KB &nbsp;·&nbsp; No dependencies &nbsp;·&nbsp; Last updated May 31, 2026</p>
                        </div>
                    </div>
                    <div class="pkg-meta-grid">
                        <div class="pkg-meta-item">
                            <div class="label">Version</div>
                            <div class="value">1.1.0</div>
                        </div>
                        <div class="pkg-meta-item">
                            <div class="label">Framework</div>
                            <div class="value">.NET 10.0</div>
                        </div>
                        <div class="pkg-meta-item">
                            <div class="label">License</div>
                            <div class="value">MIT</div>
                        </div>
                        <div class="pkg-meta-item">
                            <div class="label">Package Size</div>
                            <div class="value">181 KB</div>
                        </div>
                        <div class="pkg-meta-item">
                            <div class="label">Dependencies</div>
                            <div class="value">None</div>
                        </div>
                        <div class="pkg-meta-item">
                            <div class="label">Author</div>
                            <div class="value"><a href="https://markhazleton.com" target="_blank" rel="noopener">Mark Hazleton</a></div>
                        </div>
                        <div class="pkg-meta-item">
                            <div class="label">NuGet</div>
                            <div class="value"><a href="https://www.nuget.org/packages/ApiTestSpark" target="_blank" rel="noopener">nuget.org/packages/ApiTestSpark</a></div>
                        </div>
                        <div class="pkg-meta-item">
                            <div class="label">Repository</div>
                            <div class="value"><a href="https://github.com/markhazleton/apitestspark" target="_blank" rel="noopener">github.com/markhazleton/apitestspark</a></div>
                        </div>
                    </div>
                    <div class="pkg-actions">
                        <a href="https://www.nuget.org/packages/ApiTestSpark" class="btn-primary" target="_blank" rel="noopener" style="padding:0.6rem 1.5rem;font-size:0.9rem;">View on NuGet →</a>
                        <a href="https://github.com/markhazleton/apitestspark" class="btn-secondary" target="_blank" rel="noopener" style="padding:0.6rem 1.5rem;font-size:0.9rem;">GitHub Source</a>
                    </div>
                    <div class="pkg-tag-list">
                        <span class="pkg-tag">api</span>
                        <span class="pkg-tag">openapi-v3</span>
                        <span class="pkg-tag">minimal-api</span>
                        <span class="pkg-tag">aspnetcore</span>
                        <span class="pkg-tag">net10</span>
                        <span class="pkg-tag">react</span>
                        <span class="pkg-tag">spa</span>
                        <span class="pkg-tag">developer-tools</span>
                        <span class="pkg-tag">api-testing</span>
                        <span class="pkg-tag">embedded-ui</span>
                        <span class="pkg-tag">curl</span>
                        <span class="pkg-tag">swagger-ui-alternative</span>
                        <span class="pkg-tag">api-documentation</span>
                        <span class="pkg-tag">local-development</span>
                    </div>
                </div>
            </section>

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
                        <p>Points at your OpenAPI v3 document and renders every endpoint in a collapsible accordion grouped by tag. Works with .NET's built-in <code class="inline">MapOpenApi()</code>.</p>
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
                        <p>Inspect every request, response, and error in real time. cURL snippet generation per request. FIFO history buffer keeps memory bounded.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📄</div>
                        <h3>API Doc Builder</h3>
                        <p>Select endpoints, capture live curl + responses, annotate sections, and export a complete markdown document for front-end developer agents — at <code class="inline">/api-docs</code>.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔒</div>
                        <h3>Environment Gating</h3>
                        <p>Restrict the harness to specific environments such as Development or Staging. One option keeps the harness out of production entirely.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🎛️</div>
                        <h3>Demo Integration Toggle</h3>
                        <p>Set <code class="inline">EnableDemoIntegrations = false</code> to hide the built-in JokeAPI and JSONPlaceholder screens. Present a clean harness showing only your host API and API Doc Builder — no sample data, no external noise.</p>
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
    options.EnableDemoIntegrations = <span class="kw">false</span>; <span class="c">// hide demos, show only your API</span>
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
                        <tr>
                            <td>EnableDemoIntegrations</td>
                            <td>true</td>
                            <td>When <code class="inline">false</code>, hides the built-in JokeAPI and JSONPlaceholder demo screens from the home page and disables their routes (<code class="inline">/joke-api</code>, <code class="inline">/json-placeholder</code>). The home page shows only <strong>Host API Explorer</strong> and <strong>API Doc Builder</strong>. Default <code class="inline">true</code> — existing installs are unaffected.</td>
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
                    This server is the live demonstration. Three related API groups are running and fully annotated —
                    Products, Customers, and Orders. API Test Spark has autodiscovered all of them via the OpenAPI document.
                </p>
                <div class="demo-box">
                    <p>
                        Click to open the harness. Use the collapsible group list on the left to navigate between
                        resource groups. Request body fields are pre-filled from the schema. Responses render as
                        sortable tables or editable forms in the debug panel.
                    </p>
                    <a href="/api-test-spark/" class="btn-primary" style="font-size:1.05rem;padding:1rem 2.5rem;">⚡ Open API Test Spark</a>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.25rem;margin-top:1.75rem;text-align:left;">
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:.05em;margin-bottom:0.5rem;">Products</div>
                            <ul class="endpoint-list">
                                <li><span class="method get">GET</span><code>/products</code></li>
                                <li><span class="method get">GET</span><code>/products/{id}</code></li>
                                <li><span class="method post">POST</span><code>/products</code></li>
                                <li><span class="method put">PUT</span><code>/products/{id}</code></li>
                                <li><span class="method delete">DELETE</span><code>/products/{id}</code></li>
                            </ul>
                        </div>
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:.05em;margin-bottom:0.5rem;">Customers</div>
                            <ul class="endpoint-list">
                                <li><span class="method get">GET</span><code>/customers</code></li>
                                <li><span class="method get">GET</span><code>/customers/{id}</code></li>
                                <li><span class="method post">POST</span><code>/customers</code></li>
                                <li><span class="method put">PUT</span><code>/customers/{id}</code></li>
                                <li><span class="method delete">DELETE</span><code>/customers/{id}</code></li>
                            </ul>
                        </div>
                        <div>
                            <div style="font-size:0.75rem;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:.05em;margin-bottom:0.5rem;">Orders</div>
                            <ul class="endpoint-list">
                                <li><span class="method get">GET</span><code>/orders</code></li>
                                <li><span class="method get">GET</span><code>/orders/{id}</code></li>
                                <li><span class="method get">GET</span><code>/orders/customer/{id}</code></li>
                                <li><span class="method post">POST</span><code>/orders</code></li>
                                <li><span class="method patch" style="background:#fed7aa;color:#9a3412;">PATCH</span><code>/orders/{id}/status</code></li>
                                <li><span class="method delete">DELETE</span><code>/orders/{id}</code></li>
                            </ul>
                        </div>
                    </div>

                    <div class="badges" style="justify-content:center;margin-top:1.75rem;">
                        <div class="badge">⚡ <strong>Running</strong> .NET 10 Minimal API</div>
                        <div class="badge">📖 <strong>OpenAPI v3</strong> — full schema + descriptions</div>
                        <div class="badge">📦 <strong>ApiTestSpark</strong> v1.1.0 — MIT</div>
                        <div class="badge">🔗 <strong>16 endpoints</strong> across 3 resource groups</div>
                        <div class="badge">⚖️ <strong>No dependencies</strong> — 181 KB</div>
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
  "defaultHeaders": { "X-Tenant-Id": "acme" },
  "enableDemoIntegrations": false
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

            <!-- ── Best Practices ── -->
            <section id="best-practices">
                <h2>Maximising your API Test Spark experience</h2>
                <p class="section-intro">
                    API Test Spark's entire input is your OpenAPI v3 document. Everything it renders —
                    endpoint groups, descriptions, request scaffolds, response schemas, status codes —
                    comes directly from that document. The richer your OpenAPI metadata, the better
                    your test harness. This page is itself a live example: every section below is
                    demonstrated by the running <strong>Products</strong>, <strong>Customers</strong>,
                    and <strong>Orders</strong> API.
                    <a href="/api-test-spark/" style="color:#0ea5e9;">Open the harness</a> alongside
                    this guide to see each technique in action.
                </p>

                <!-- Impact table -->
                <table class="impact-table">
                    <thead>
                        <tr><th>OpenAPI feature</th><th>What API Test Spark does with it</th><th>Impact</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>operation <code>tags</code> with "Namespace: Label" format</td><td>Two-level collapsible accordion groups on the left nav</td><td><span class="pill pill-high">High</span></td></tr>
                        <tr><td>operation <code>summary</code></td><td>Bold title shown on every endpoint card</td><td><span class="pill pill-high">High</span></td></tr>
                        <tr><td>operation <code>description</code> (markdown)</td><td>Rendered markdown below the summary — bold, lists, code, tables</td><td><span class="pill pill-high">High</span></td></tr>
                        <tr><td><code>operationId</code> / <code>WithName()</code></td><td>Copyable chip beside each endpoint; used in API Doc Builder references</td><td><span class="pill pill-high">High</span></td></tr>
                        <tr><td>request body schema with <code>example</code> / <code>default</code></td><td>JSON scaffold pre-filled in the request body editor</td><td><span class="pill pill-high">High</span></td></tr>
                        <tr><td>schema property <code>description</code></td><td>Shown in the schema property table beside each field</td><td><span class="pill pill-high">High</span></td></tr>
                        <tr><td><code>Produces&lt;T&gt;</code> per status code</td><td>Coloured response-code badges with expandable inline schemas</td><td><span class="pill pill-high">High</span></td></tr>
                        <tr><td><code>info.title</code>, <code>info.version</code>, <code>info.contact</code></td><td>API info header at the top of the Host API screen</td><td><span class="pill pill-med">Medium</span></td></tr>
                        <tr><td><code>info.description</code> (markdown)</td><td>Rendered in the API info header — ideal for workflow walkthroughs</td><td><span class="pill pill-med">Medium</span></td></tr>
                        <tr><td>parameter <code>description</code> + <code>example</code></td><td>Shown in the parameter table; example pre-fills path/query fields</td><td><span class="pill pill-med">Medium</span></td></tr>
                        <tr><td>schema constraints (<code>minLength</code>, <code>maximum</code>, <code>enum</code>)</td><td>Displayed in schema property tables; enum drives a select input</td><td><span class="pill pill-med">Medium</span></td></tr>
                        <tr><td><code>deprecated: true</code></td><td>Endpoint visually flagged as deprecated in the accordion</td><td><span class="pill pill-low">Low</span></td></tr>
                        <tr><td><code>info.license</code></td><td>Shown in the API info header</td><td><span class="pill pill-low">Low</span></td></tr>
                    </tbody>
                </table>

                <!-- Card grid -->
                <div class="bp-grid" style="margin-top:2.5rem;">

                    <div class="bp-card">
                        <h3>1 — Tag your endpoints with a two-level group name</h3>
                        <p>API Test Spark parses tags in <code class="inline">"Namespace: Label"</code> format into a two-level accordion. Without this pattern all endpoints land in a single flat list.</p>
                        <ul>
                            <li>Use <code class="inline">WithTags("Products: Catalog")</code> on your route group</li>
                            <li>Or apply <code class="inline">[Tags("Orders: Lifecycle")]</code> on a controller</li>
                            <li>The colon + space is the separator — anything before it is the group, anything after is the sub-label</li>
                            <li>Consistent casing matters: <code class="inline">"Auth: Tokens"</code> and <code class="inline">"auth: tokens"</code> become separate groups</li>
                        </ul>
                    </div>

                    <div class="bp-card gold">
                        <h3>2 — Write a summary and a description for every operation</h3>
                        <p><code class="inline">summary</code> is the title shown on every card. <code class="inline">description</code> accepts full markdown and renders inline — use it to explain behaviour, constraints, and cross-references.</p>
                        <ul>
                            <li><strong>Summary</strong> — short imperative phrase: <em>"List all products"</em>, <em>"Place a new order"</em></li>
                            <li><strong>Description</strong> — explain what the response contains, valid input ranges, seeded test data, and what to try next</li>
                            <li>Markdown bold (<code class="inline">**text**</code>), inline code, bullet lists, fenced code blocks, and tables all render</li>
                            <li>Embed a <strong>workflow callout</strong> in your POST description linking to the next step in a typical flow</li>
                        </ul>
                    </div>

                    <div class="bp-card green">
                        <h3>3 — Name every operation with <code style="font-size:0.9em">WithName()</code></h3>
                        <p><code class="inline">operationId</code> (set via <code class="inline">WithName()</code> on Minimal APIs) is surfaced as a copyable chip on each endpoint card and used as the section heading in exported API Doc Builder documents.</p>
                        <ul>
                            <li>Use PascalCase verb-noun: <code class="inline">GetProductById</code>, <code class="inline">CreateOrder</code>, <code class="inline">UpdateOrderStatus</code></li>
                            <li>Must be unique across the entire document</li>
                            <li>On controllers, the method name becomes the <code class="inline">operationId</code> automatically</li>
                            <li>Clients and generated code also use this — it doubles as your SDK method name</li>
                        </ul>
                    </div>

                    <div class="bp-card purple">
                        <h3>4 — Declare every response code with <code style="font-size:0.9em">Produces&lt;T&gt;</code></h3>
                        <p>Each <code class="inline">.Produces&lt;T&gt;(statusCode)</code> call adds a coloured badge in the harness. Click the badge to expand the inline schema. Undeclared status codes produce no badge — testers have to guess.</p>
                        <ul>
                            <li>Always declare 200/201 with the response type</li>
                            <li>Declare 400 with <code class="inline">Produces&lt;string&gt;(400)</code> or a problem-details type</li>
                            <li>Declare 404 for any lookup by ID</li>
                            <li>Use <code class="inline">TypedResults</code> — it declares response types automatically without extra <code class="inline">.Produces()</code> calls</li>
                            <li>On controllers, use <code class="inline">[ProducesResponseType]</code> attributes</li>
                        </ul>
                    </div>

                    <div class="bp-card">
                        <h3>5 — Annotate your schema types with descriptions and constraints</h3>
                        <p>API Test Spark renders a property table for every request body and response schema. <code class="inline">[Description]</code>, <code class="inline">[Range]</code>, <code class="inline">[MinLength]</code>, and <code class="inline">[MaxLength]</code> all appear as columns in that table.</p>
                        <ul>
                            <li>Add <code class="inline">[Description("...")]</code> from <code class="inline">System.ComponentModel</code> to every public property</li>
                            <li>Use <code class="inline">[Range(min, max)]</code> for numeric bounds — displayed in the constraints column</li>
                            <li>Use <code class="inline">[MinLength] / [MaxLength]</code> for string lengths</li>
                            <li>Use <code class="inline">[Required]</code> — surfaced as a <strong>required</strong> marker in the table</li>
                            <li><code class="inline">enum</code> types render as a select input in the scaffold editor</li>
                        </ul>
                    </div>

                    <div class="bp-card gold">
                        <h3>6 — Set examples and defaults on schema properties</h3>
                        <p>API Test Spark pre-fills the JSON scaffold from <code class="inline">example → default → enum[0] → type placeholder</code>. Without examples, every field shows a generic placeholder. With examples, testers can run requests immediately.</p>
                        <ul>
                            <li>Add <code class="inline">[DefaultValue("acme")]</code> to pre-fill string fields</li>
                            <li>For records, set default parameter values: <code class="inline">int StockQuantity = 0</code></li>
                            <li>Use <code class="inline">WithOpenApi(op => { op.RequestBody.Content["application/json"].Example = ... })</code> for a full example body</li>
                            <li>Realistic test data (real-looking IDs, prices, names) makes the harness immediately usable</li>
                        </ul>
                    </div>

                    <div class="bp-card green">
                        <h3>7 — Use <code style="font-size:0.9em">info.description</code> for workflow documentation</h3>
                        <p>The API-level <code class="inline">info.description</code> field renders as markdown in the Host API screen header. Use it to describe the overall API, link resource groups together, and provide a step-by-step workflow for testers.</p>
                        <ul>
                            <li>Set it via <code class="inline">AddDocumentTransformer</code> in <code class="inline">AddOpenApi()</code></li>
                            <li>Include a markdown table of resource groups and their endpoint counts</li>
                            <li>Add a numbered workflow walkthrough: create customer → create product → place order → advance status</li>
                            <li>Mention seeded test data (IDs, values) so testers don't have to explore blind</li>
                        </ul>
                    </div>

                    <div class="bp-card red">
                        <h3>8 — What degrades the experience</h3>
                        <p>Avoid these patterns — they leave testers with empty or misleading harness UI.</p>
                        <ul>
                            <li><strong>No tags</strong> — all endpoints collapse into one unsorted list with no groups</li>
                            <li><strong>No summary</strong> — card titles show the raw HTTP method + path only</li>
                            <li><strong>No response types</strong> — no schema badges, no inline schema preview</li>
                            <li><strong>No property descriptions</strong> — schema table has blank description column</li>
                            <li><strong>Returning <code class="inline">IResult</code> without TypedResults</strong> — response type information is lost; use <code class="inline">Results&lt;Ok&lt;T&gt;, NotFound&gt;</code> instead</li>
                            <li><strong>Anonymous objects as response types</strong> — schema is inferred as empty object</li>
                        </ul>
                    </div>

                </div>

                <!-- Before / after code comparison -->
                <h3 style="margin-top:1rem;">Before and after — Minimal API endpoint</h3>
                <p class="section-intro" style="margin-bottom:1rem;">The difference between a bare endpoint and a fully-annotated one.</p>

                <div class="diff-block">
                    <div>
                        <div class="diff-label bad">✗ Bare — minimal harness value</div>
<pre><span class="c">// No tags, no name, no summary,</span>
<span class="c">// no description, no response type</span>
app.<span class="cm">MapGet</span>(<span class="st">"/products/{id}"</span>,
    (int id, ProductCache cache) =>
        cache.GetById(id) ??
        (IResult)Results.NotFound()
);</pre>
                    </div>
                    <div>
                        <div class="diff-label good">✓ Annotated — full harness value</div>
<pre>app.<span class="cm">MapGet</span>(<span class="st">"/products/{id}"</span>, GetById)
   .<span class="cm">WithName</span>(<span class="st">"GetProductById"</span>)
   .<span class="cm">WithSummary</span>(<span class="st">"Get a product by ID"</span>)
   .<span class="cm">WithDescription</span>(<span class="st">"Returns a single product. "</span>
       + <span class="st">"Seeded IDs are **1–10**. "</span>
       + <span class="st">"Returns 404 if not found."</span>)
   .<span class="cm">Produces</span>&lt;<span class="ty">Product</span>&gt;(<span class="ty">200</span>)
   .<span class="cm">Produces</span>(<span class="ty">404</span>);

<span class="c">// Handler uses TypedResults so the</span>
<span class="c">// return type is inferred automatically</span>
<span class="kw">static</span> Results&lt;Ok&lt;<span class="ty">Product</span>&gt;, NotFound&gt;
GetById(<span class="kw">int</span> id, ProductCache cache) =>
    cache.GetById(id) <span class="kw">is</span> { } p
        ? TypedResults.Ok(p)
        : TypedResults.NotFound();</pre>
                    </div>
                </div>

                <!-- Controller-based APIs callout -->
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1.25rem 1.5rem;margin-top:1.5rem;">
                    <h3 style="color:#15803d;margin-bottom:0.5rem;">Controller-based APIs</h3>
                    <p style="color:#166534;font-size:0.9rem;margin-bottom:0.75rem;">The same principles apply — just use attributes instead of fluent calls.</p>
<pre style="font-size:0.84rem;"><span class="c">/// &lt;summary&gt;Get a product by ID.&lt;/summary&gt;</span>
<span class="c">/// &lt;remarks&gt;Seeded IDs are **1–10**. Returns 404 if not found.&lt;/remarks&gt;</span>
[<span class="ty">HttpGet</span>(<span class="st">"{id}"</span>)]
[<span class="ty">Tags</span>(<span class="st">"Products: Catalog"</span>)]
[<span class="ty">ProducesResponseType</span>(<span class="kw">typeof</span>(<span class="ty">Product</span>), <span class="ty">200</span>)]
[<span class="ty">ProducesResponseType</span>(<span class="ty">404</span>)]
<span class="kw">public</span> ActionResult&lt;<span class="ty">Product</span>&gt; GetById(<span class="kw">int</span> id) { ... }</pre>
                </div>

                <!-- Live example link -->
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:1.25rem 1.5rem;margin-top:1.5rem;">
                    <h3 style="color:#1d4ed8;margin-bottom:0.5rem;">This site is the live reference</h3>
                    <p style="color:#1e40af;font-size:0.9rem;">
                        Every best practice above is implemented in this demo. The Products, Customers, and Orders
                        source code is available in the
                        <a href="https://github.com/markhazleton/apitestspark/tree/main/SampleApi" style="color:#0ea5e9;" target="_blank" rel="noopener">SampleApi folder on GitHub</a>.
                        Open the harness and compare what you see against the source to understand exactly
                        what each annotation produces.
                    </p>
                    <a href="/api-test-spark/" class="btn-primary" style="display:inline-block;margin-top:0.75rem;padding:0.6rem 1.5rem;font-size:0.9rem;">⚡ Open the harness</a>
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
                        <p style="color:#475569;margin-top:0.25rem;">Only OpenAPI v3.x documents are parsed. For Swagger 2.0 APIs, use a converter to produce a v3 document (e.g. <a href="https://converter.swagger.io/" style="color:#0ea5e9;">converter.swagger.io</a>) and point <code class="inline">OpenApiUrl</code> at the converted output.</p>
                    </div>
                    <div>
                        <h3>Can I generate API documentation from test runs?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">Yes — the <strong>API Doc Builder</strong> at <code class="inline">/api-docs</code> lets you select endpoints, capture live requests and responses, annotate sections, and export a complete markdown document targeted at front-end developer agents. It includes exact curl commands, full JSON responses, parameter tables, and schema tables.</p>
                    </div>
                    <div>
                        <h3>Can I hide the JokeAPI and JSONPlaceholder demo screens?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">Yes — set <code class="inline">options.EnableDemoIntegrations = false</code> when calling <code class="inline">MapApiTestSpark()</code>. The home page will show only the <strong>Host API Explorer</strong> and <strong>API Doc Builder</strong>, and the demo routes (<code class="inline">/joke-api</code>, <code class="inline">/json-placeholder</code>) are disabled entirely. This is the recommended setting for teams using API Test Spark to test their own APIs rather than as a general-purpose demo tool.</p>
                    </div>
                    <div>
                        <h3>What does this site use for EnableDemoIntegrations?</h3>
                        <p style="color:#475569;margin-top:0.25rem;">This demo site sets <code class="inline">EnableDemoIntegrations = true</code> so you can explore all features including the built-in JokeAPI and JSONPlaceholder integrations. In a real installation you would typically set this to <code class="inline">false</code> to present a focused harness for your own API.</p>
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
