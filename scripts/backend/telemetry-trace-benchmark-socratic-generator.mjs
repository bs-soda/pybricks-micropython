#!/usr/bin/env node
/**
 * Backend Architecture & Telemetry Integration Socratic Specification Generator
 * 
 * Generates technical documentation for backend Axum middleware trace extraction,
 * outbox envelope packaging, and multi-tenant contextualization.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(process.cwd());
const OUT_FILE = join(REPO_ROOT, 'docs/04-testing/telemetry-trace-benchmark-unit-spec.md');

const content = `# Backend & Crate Unit Specification: OpenTelemetry Crate & Axum Middleware Verification

> **Specification Standard:** Socratic Engineering Framework  
> **Goal Reference:** [G-131: Cross-Service Distributed Trace Propagation & Performance SLA Benchmark Verification Harness](file://${REPO_ROOT}/docs/07-backlog/goals/G-131-cross-service-trace-benchmark.md)  
> **Target Crates:** \`telemetry-otel\`, \`api\`, \`auth\`  

---

## 🏛️ Unit Test Strategy & Architecture

### 1. W3C TraceContext Propagator Invariants
- Implements \`opentelemetry_sdk::propagation::TraceContextPropagator\`
- Extracts \`traceparent: 00-{trace_id}-{span_id}-{flags}\` from inbound HTTP headers.
- Automatically generates root \`trace_id\` (128-bit hex) and \`span_id\` (64-bit hex) when missing.
- Injects \`X-Trace-ID\` response header for client-side correlation.

### 2. Multi-Tenant Span Enrichment Invariants
- Each span automatically records:
  - \`tenant.agency_id\` (UUID)
  - \`tenant.brand_id\` (UUID)
  - \`user.id\` (UUID)
  - \`http.route\` (LowCardinality string)
  - \`http.status_code\` (u16)
- Attributes are serialized as structured JSON and ingested into ClickHouse with \`ZSTD(3)\` compression.

### 3. Outbox Asynchronous Queue Propagation
- Struct \`OutboxTraceMetadata\` captures active span context during SQL transaction insert.
- Worker jobs deserialize metadata and attach as parent context before executing background handlers.
`;

mkdirSync(join(REPO_ROOT, 'docs/04-testing'), { recursive: true });
writeFileSync(OUT_FILE, content, 'utf-8');
console.log(`✓ Generated Backend Unit Spec: ${OUT_FILE}`);
