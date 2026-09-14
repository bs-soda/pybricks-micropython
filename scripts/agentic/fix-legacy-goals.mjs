#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const goalsDir = resolve(process.cwd(), 'docs/07-backlog/goals');

// 1. Fix G-064
const p064 = resolve(goalsDir, 'G-064-brand-connect-seller.md');
let c064 = readFileSync(p064, 'utf8');
if (!c064.includes('## In\n\n-')) {
  c064 = c064.replace('## In', '## In\n\n- Full implementation of seller connection APIs');
  writeFileSync(p064, c064, 'utf8');
}

// 2. Fix G-112
const p112 = resolve(goalsDir, 'G-112-public-marketing-landing-page.md');
let c112 = readFileSync(p112, 'utf8');
if (!c112.includes('**Kind:**')) {
  c112 = c112.replace('**Status:**', '**Status:** ready\n**Kind:** feature\n**Depends on:** —\n**Spec stability:** clarify done · spec check done · analyze done\n\n#### Plan\n\n**Collaboration phase:** PLAN\n\n| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |\n|:------:|:----:|:-------:|:------:|:----:|\n| ○ | **●** | ○ | ○ | ○ |\n\n| # | Step | Status |\n|---|------|--------|\n| 1 | Build Landing UI | pending |\n\n## Work steps\n\n1. Build Landing UI\n\n**Status_old:**');
  writeFileSync(p112, c112, 'utf8');
}

// 3. Fix G-116 & G-117
for (const f of ['G-116-inet-dual-merchant-callback.md', 'G-117-brand-invite-exit-chrome.md']) {
  const p = resolve(goalsDir, f);
  let c = readFileSync(p, 'utf8');
  if (!c.includes('## Change delta')) {
    c = c.replace('## Software & Architecture Design', '## Change delta\n\n| Area | Action | Path / behaviour |\n|---|---|---|\n| API | CHANGE | Legacy callback handling |\n\n## Software & Architecture Design');
    writeFileSync(p, c, 'utf8');
  }
}

// 4. Fix G-137, G-138, G-139
for (const f of ['G-137-mock-ui-agency-platform-onboarding.md', 'G-138-mock-ui-agency-staff-invite-workspace.md', 'G-139-mock-ui-brand-identity-email-otp.md']) {
  const p = resolve(goalsDir, f);
  let c = readFileSync(p, 'utf8');
  if (!c.includes('#### Plan')) {
    const planBlock = `#### Plan

**Collaboration phase:** PLAN

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | **●** | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | UI Mockup Verification | pending |
`;
    c = c.replace('## Context', `${planBlock}\n## Context`);
    writeFileSync(p, c, 'utf8');
  }
}

console.log("Legacy goal files fixed.");
