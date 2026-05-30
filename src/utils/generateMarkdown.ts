import type { ApiDoc, DocEntry } from '../types';

// ── curl builder ─────────────────────────────────────────────────────────────

export function buildCurlCommand(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): string {
  const parts: string[] = [`curl -X ${method} \\`];
  parts.push(`  "${url}" \\`);

  const filteredHeaders = Object.entries(headers).filter(
    ([k]) => !['content-length', 'host', 'connection', 'accept-encoding'].includes(k.toLowerCase()),
  );
  for (const [k, v] of filteredHeaders) {
    parts.push(`  -H "${k}: ${v}" \\`);
  }

  if (body !== undefined && body !== null && method !== 'GET' && method !== 'DELETE') {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    // Compact for single-line, expanded for objects
    const compact = typeof body === 'string' ? body : JSON.stringify(body);
    if (compact.length <= 120) {
      parts.push(`  -d '${compact}'`);
    } else {
      parts.push(`  -d '${bodyStr}'`);
    }
  } else {
    // Remove trailing backslash from last header
    const last = parts[parts.length - 1];
    parts[parts.length - 1] = last.replace(/ \\$/, '');
  }

  return parts.join('\n');
}

// ── per-entry section ─────────────────────────────────────────────────────────

function fenceJson(value: unknown): string {
  if (value === null || value === undefined) return '```json\nnull\n```';
  const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return `\`\`\`json\n${str}\n\`\`\``;
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function statusBadge(status: number): string {
  if (status >= 200 && status < 300) return `✅ ${status}`;
  if (status >= 400 && status < 500) return `⚠️ ${status}`;
  return `❌ ${status}`;
}

function entrySection(entry: DocEntry, index: number): string {
  const { endpoint, capture, note } = entry;
  const lines: string[] = [];

  // Section heading — use operationId if available, else summary
  const heading = endpoint.operationId || endpoint.summary || `${endpoint.method} ${endpoint.path}`;
  lines.push(`## ${index + 1}. ${heading}`);
  lines.push('');

  // Method + path pill
  lines.push(`**\`${endpoint.method} ${endpoint.path}\`**`);
  lines.push('');

  // Author note (if any)
  if (note.trim()) {
    lines.push(`> ${note.trim().split('\n').join('\n> ')}`);
    lines.push('');
  }

  // Summary and description
  if (endpoint.summary && endpoint.summary !== `${endpoint.method} ${endpoint.path}`) {
    lines.push(`**Summary:** ${endpoint.summary}`);
    lines.push('');
  }
  if (endpoint.description) {
    lines.push(endpoint.description);
    lines.push('');
  }

  // Parameters table
  const params = endpoint.parameters;
  if (params.length > 0) {
    lines.push('### Parameters');
    lines.push('');
    lines.push('| Name | Location | Type | Required | Description |');
    lines.push('|------|----------|------|----------|-------------|');
    for (const p of params) {
      const typeStr = p.schema.format ? `${p.schema.type}(${p.schema.format})` : p.schema.type;
      const req = p.required ? '✓' : '';
      const desc = p.description || '';
      lines.push(`| \`${p.name}\` | ${p.in} | \`${typeStr}\` | ${req} | ${desc} |`);
    }
    lines.push('');
  }

  // Request body schema
  if (endpoint.requestBodySchema?.properties) {
    lines.push('### Request Body');
    lines.push('');
    if (endpoint.requestBodyDescription) {
      lines.push(endpoint.requestBodyDescription);
      lines.push('');
    }
    lines.push('| Field | Type | Required | Default | Description |');
    lines.push('|-------|------|----------|---------|-------------|');
    const reqFields = endpoint.requestBodySchema.required ?? [];
    for (const [field, prop] of Object.entries(endpoint.requestBodySchema.properties)) {
      const typeStr = prop.format ? `${prop.type}(${prop.format})` : (prop.type ?? 'any');
      const req = reqFields.includes(field) ? '✓' : '';
      const def = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '';
      const desc = prop.description || '';
      lines.push(`| \`${field}\` | \`${typeStr}\` | ${req} | ${def} | ${desc} |`);
    }
    lines.push('');
  }

  // Documented response codes
  if (endpoint.responseCodes.length > 0) {
    lines.push('### Response Codes');
    lines.push('');
    lines.push('| Status | Description |');
    lines.push('|--------|-------------|');
    for (const rc of endpoint.responseCodes) {
      lines.push(`| \`${rc.status}\` | ${rc.description} |`);
    }
    lines.push('');
  }

  // Live capture
  if (capture) {
    lines.push('### Live Example');
    lines.push('');
    lines.push(
      `> *Captured ${new Date(capture.capturedAt).toLocaleString()} — ` +
      `${statusBadge(capture.status)} ${capture.statusText} in ${formatDuration(capture.durationMs)}*`,
    );
    lines.push('');

    lines.push('#### Request');
    lines.push('');
    lines.push('```bash');
    lines.push(capture.curlCommand);
    lines.push('```');
    lines.push('');

    lines.push('#### Response');
    lines.push('');
    lines.push(`**Status:** ${statusBadge(capture.status)} ${capture.statusText}  `);
    lines.push(`**Duration:** ${formatDuration(capture.durationMs)}`);
    lines.push('');

    if (capture.responseHeaders['content-type']) {
      lines.push(`**Content-Type:** \`${capture.responseHeaders['content-type']}\``);
      lines.push('');
    }

    lines.push(fenceJson(capture.responseBody));
    lines.push('');
  } else {
    lines.push('### Live Example');
    lines.push('');
    lines.push('> *No capture yet — fire the request in the capture panel to record a live example.*');
    lines.push('');
  }

  return lines.join('\n');
}

// ── top-level document ────────────────────────────────────────────────────────

export function generateMarkdown(doc: ApiDoc): string {
  const lines: string[] = [];
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Frontmatter-style header block
  lines.push(`# ${doc.title || 'API Integration Guide'}`);
  lines.push('');
  lines.push(`*Generated by [API Test Spark](https://apitest.makeboldspark.com) · ${now}*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Audience callout
  lines.push('> **Audience:** Front-end developer agent');
  lines.push('> ');
  lines.push('> This document provides everything you need to integrate with the API:');
  lines.push('> executable curl examples with real captured responses, full parameter');
  lines.push('> and schema reference, and response code tables. Copy the curl commands');
  lines.push('> directly into your terminal or adapt them into `fetch()`/`axios` calls.');
  lines.push('');

  // Table of contents
  if (doc.entries.length > 0) {
    lines.push('## Table of Contents');
    lines.push('');
    if (doc.intro) lines.push('- [Overview](#overview)');
    for (let i = 0; i < doc.entries.length; i++) {
      const e = doc.entries[i];
      const heading = e.endpoint.operationId || e.endpoint.summary || `${e.endpoint.method} ${e.endpoint.path}`;
      // GitHub-style anchor: lowercase, spaces → hyphens, strip special chars
      const anchor = `${i + 1}-${heading}`.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      lines.push(`- [${i + 1}. ${heading}](#${anchor})`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Intro / overview
  if (doc.intro) {
    lines.push('## Overview');
    lines.push('');
    lines.push(doc.intro);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Endpoint sections
  for (let i = 0; i < doc.entries.length; i++) {
    lines.push(entrySection(doc.entries[i], i));
    if (i < doc.entries.length - 1) {
      lines.push('---');
      lines.push('');
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*This document was generated by [API Test Spark](https://www.nuget.org/packages/ApiTestSpark) — an open-source interactive API test harness for .NET 10 Minimal APIs.*');
  lines.push('');

  return lines.join('\n');
}
