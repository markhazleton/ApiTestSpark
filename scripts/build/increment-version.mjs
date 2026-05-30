#!/usr/bin/env node
// Cross-platform Node.js script to generate build metadata, stage deploy config, and optionally increment version
// Usage: node increment-version.mjs [--increment|--no-increment]

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

const packageJsonPath = join(rootDir, 'package.json');
const buildInfoPath = join(rootDir, 'src', 'public', 'build-info.json');
const staticWebAppConfigPath = join(rootDir, 'staticwebapp.config.json');
const stagedStaticWebAppConfigPath = join(rootDir, 'src', 'public', 'staticwebapp.config.json');
const shouldIncrement = process.argv.includes('--increment') && !process.argv.includes('--no-increment');

try {
  // Read package.json and strip BOM if present
  let packageJsonContent = readFileSync(packageJsonPath, 'utf8');
  // Remove BOM character (U+FEFF) if present
  if (packageJsonContent.charCodeAt(0) === 0xFEFF) {
    packageJsonContent = packageJsonContent.slice(1);
  }
  const packageJson = JSON.parse(packageJsonContent);

  // Parse current version — must be strict semver major.minor.patch
  const version = packageJson.version;
  const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!versionMatch) {
    console.error(`Invalid version format in package.json: '${version}'. Expected major.minor.patch (e.g. 1.0.0).`);
    process.exit(1);
  } else if (shouldIncrement) {
    // Increment patch version
    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);
    const patch = parseInt(versionMatch[3]) + 1;
    const newVersion = `${major}.${minor}.${patch}`;
    
    packageJson.version = newVersion;
    console.log(`✓ Version incremented: ${version} → ${newVersion}`);
  } else {
    console.log(`✓ Using existing version: ${version}`);
  }

  if (shouldIncrement) {
    // Update package.json only for explicit release/version bump workflows.
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  }

  // Generate build info with current UTC timestamp
  const now = new Date();
  const buildInfo = {
    version: packageJson.version,
    buildDate: now.toISOString(),
    buildTimestamp: Math.floor(now.getTime() / 1000)
  };

  // Ensure src/public directory exists
  mkdirSync(dirname(buildInfoPath), { recursive: true });

  // Write build info
  writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2) + '\n', 'utf8');

  // Keep the Static Web Apps config in the built output when deploying prebuilt assets.
  copyFileSync(staticWebAppConfigPath, stagedStaticWebAppConfigPath);

  console.log(`✓ Build info generated: ${buildInfoPath}`);
  console.log(`✓ Static Web Apps config staged: ${stagedStaticWebAppConfigPath}`);
  console.log(`  Version: ${buildInfo.version}`);
  console.log(`  Build Date: ${buildInfo.buildDate}`);
  console.log(`  Build Timestamp: ${buildInfo.buildTimestamp}`);

  process.exit(0);
} catch (error) {
  console.error('Failed to increment version:', error.message);
  process.exit(1);
}
