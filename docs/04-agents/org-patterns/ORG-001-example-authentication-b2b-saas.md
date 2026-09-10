# ORG-001: Authentication — B2B SaaS session + JWT API

**Status:** example *(bootstrap sample — replace on bootstrap)*
**Category:** authentication
**Reusable score:** — *(not validated — format sample only)*
**Source projects:** 0 *(bootstrap sample)*
**Last validated:** —
**Publish approver:** —

> Example pattern. Delete or replace when bootstrapping a real studio library.

---

## Context

B2B SaaS web app + mobile or SPA client; API-first; team knows OAuth concepts; PDPA applies; no PCI in v1.

## Problem / pain pattern

- Protected routes blocked all feature work until auth exists
- Session-only web auth does not work for mobile API clients
- Social login requested but not on critical path for initial release

## Decision pattern

- **PDR:** Defer social login to post-initial release
- **ADR:** JWT access token (short TTL) + refresh token; web uses same API as mobile

## Evidence types that supported it

| Type | Typical signal |
|------|----------------|
| interview | Mobile roadmap confirmed in discovery |
| metrics | Post-ship: auth-related support tickets &lt; 2% of volume |
| incident | Zero auth boundary incidents in 12 months across 2 projects |

## Outcome

| Metric | Typical result |
|--------|----------------|
| Time to first protected API | 1 sprint |
| Auth support burden | Low |

**Outcome rating:** good

## Lesson

Ship JWT API auth first; add social login only after core loop validated — mobile clients unblocked without OAuth cert work in v1.

## Works well when

- API + web/mobile clients share backend
- Team can maintain token refresh flow
- Initial release timeline &lt; 8 weeks

## Avoid when

- Pure static site, no API
- Enterprise SSO mandatory day one (use ORG-xxx SSO pattern instead)
- PCI scope requires different auth boundary

## Conflicts with

Session-cookie-only web pattern when mobile is in scope.

## Agent use (v5 / v6)

- Match tags: `b2b`, `saas`, `jwt`, `mobile-client`
- Recommend only if project constraints include API + mobile; cite ORG-001 + ask for local ADR draft

## Links

- Category: ADR auth / session
