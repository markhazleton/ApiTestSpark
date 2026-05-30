# Deployment Guide

## Azure Static Web App Configuration

Update these values for your deployment:

- **Resource Name**: `<your-resource-name>`
- **Resource Group**: `<your-resource-group>`
- **Subscription ID**: `<your-subscription-id>`
- **Production URL**: `<your-static-web-app-url>`
- **Branch**: `main`

## Deployment Methods

### Method 1: Azure DevOps Pipeline (Recommended)

The repository includes `azure-pipelines.yml` for automated deployment.

**Setup Steps:**

1. **Get Deployment Token** from Azure Portal:
   - Navigate to your Static Web App resource in the Azure Portal
   - Click "Manage deployment token"
   - Copy the token

2. **Configure Pipeline Variable**:
   - Go to Azure DevOps Pipelines
   - Create/Edit pipeline pointing to `azure-pipelines.yml`
   - Add secret variable: `AZURE_STATIC_WEB_APPS_API_TOKEN` with the deployment token
   - Mark as "Keep this value secret"

3. **Deploy**:
   - Push to `main` branch → Deploys to production
   - Push to `develop` branch → Deploys to preview environment

### Method 2: Azure CLI (Manual)

```powershell
# Login to Azure
az login

# Verify and build the application
npm run verify

# Deploy to static web app
az staticwebapp upload `
  --name <your-resource-name> `
  --resource-group <your-resource-group> `
  --subscription <your-subscription-id> `
  --source build `
  --no-wait
```

### Method 3: SWA CLI (Local Testing & Deployment)

```powershell
# Install SWA CLI globally
npm install -g @azure/static-web-apps-cli

# Test locally with emulated Azure environment
npm run verify
swa start build --port 4280

# Deploy from local machine
swa deploy build `
  --app-name <your-resource-name> `
  --resource-group <your-resource-group> `
  --subscription-id <your-subscription-id> `
  --deployment-token $env:AZURE_STATIC_WEB_APPS_API_TOKEN
```

## Configuration Files

### staticwebapp.config.json

Located in repository root. Configures:
- SPA routing (fallback to index.html)
- Cache headers for assets
- Security headers (CSP, X-Frame-Options)
- MIME types

### Build Output

- **Build command**: `npm run build`
- **Verification command**: `npm run verify`
- **Release build command**: `npm run build:release`
- **Output directory**: `build/`
- **Entry point**: `build/index.html`
- **Included config**: The build step stages `staticwebapp.config.json` into the generated `build/` output via `src/public/`.
- **Pipeline deploy path**: When `skip_app_build: true`, set `app_location: 'build'` and leave `output_location` empty so Azure Static Web Apps uploads only the built site, not the repository root.

## NuGet Package Build (`WebSpark.ApiTestHarness`)

The standalone SWA deployment and the NuGet package are built from the same source using a `VITE_BASE_PATH` environment variable:

| Build type | `VITE_BASE_PATH` | `base` in HTML | Used for |
| --- | --- | --- | --- |
| Standalone (SWA) | *(unset)* | `/` | Azure Static Web Apps deployment |
| NuGet embedded | `/api-test-harness/` | `/api-test-harness/` | `WebSpark.ApiTestHarness` package |

### Producing the NuGet package

```powershell
# From repo root — builds React SPA then packs .NET library
.\scripts\build\pack.ps1

# Skip npm audit (e.g. in CI with separate audit step)
.\scripts\build\pack.ps1 -SkipAudit

# Output: ./nupkg/WebSpark.ApiTestHarness.{version}.nupkg
```

The script performs these steps in order:

1. Runs `npm audit --audit-level=critical` (warns on high, fails on critical)
2. Builds the React SPA with `VITE_BASE_PATH=/api-test-harness/`
3. Reads version from `package.json` and uses it as the NuGet version
4. Runs `dotnet pack` with pre-pack validation that embedded assets exist

### Security note

The harness config endpoint (`/api-test-harness/config`) is publicly accessible and returns deployment metadata. **Do not expose the harness to the public internet.** Use environment gating:

```csharp
app.MapApiTestHarness(options =>
{
    options.Environments = ["Development", "Staging"];
});
```

## Environment-Specific Configuration

The app supports multiple API environments configured at runtime:
- `localhost` - Local development API
- `tst2` - Secondary testing environment
- `other` - Custom endpoint

No environment-specific builds needed — configuration is managed in browser localStorage.

## Monitoring

### Application Insights
Configure your own Application Insights resource:
- Set the `CONNECTION_STRING` in `src/utils/appInsights.ts`
- Leave empty to disable telemetry
- Automatically tracks page views, API calls, errors, and performance metrics

### Static Web App Metrics
Monitor via the Azure Portal on your Static Web App resource's Metrics blade:
- Bandwidth usage
- Request count
- Error rates
- Geographic distribution

## Custom Domain (Optional)

To add a custom domain:

```powershell
# Add custom domain
az staticwebapp hostname set `
  --name <your-resource-name> `
  --resource-group <your-resource-group> `
  --hostname <your-custom-domain>
```

Then configure DNS:
- **Type**: CNAME
- **Name**: `<subdomain>`
- **Value**: `<your-swa-default-domain>.azurestaticapps.net`

## Preview Environments

Azure Static Web Apps automatically creates preview environments for:
- Pull requests (when configured)
- Feature branches (via pipeline deployment_environment)

Access preview URLs via Azure Portal or pipeline output.

## Rollback Procedure

### Via Azure Portal
1. Navigate to Static Web App
2. Go to "Environment" → "Production"
3. View "Deployment history"
4. Select previous deployment → "Redeploy"

### Via Git
```powershell
# Revert to previous commit
git revert HEAD
git push origin main
# Pipeline will auto-deploy reverted version
```

## Troubleshooting

### Build Fails
- Check Node.js version matches pipeline (20.x)
- Verify `npm ci` installs without errors
- Run `npm run verify` locally first

### Deployment Fails With "app content was too large"
- Verify the Azure Static Web Apps task is deploying `build/`, not `/`
- If `skip_app_build: true` is set, use `app_location: 'build'` and `output_location: ''`
- Uploading the repository root can include `node_modules` and exceed the Free tier 250 MB content limit

### Deployment Succeeds but App Shows Errors
- Check browser console for errors
- Verify `staticwebapp.config.json` is in repository root
- Check CSP headers aren't blocking resources

### API Calls Fail
- This is expected — users configure API endpoints in the app
- Check Application Insights for actual errors

## Cost Monitoring

Current tier: **Free**
- 100 GB bandwidth/month included
- 0.5 GB storage included
- 2 custom domains supported

Monitor usage via the Azure Portal on your Static Web App resource's Metrics blade.
