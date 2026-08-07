# Risk Register

## Rating

Probability and impact are `low`, `medium`, `high`, or `critical`. Owners are roles until named individuals are assigned.

| ID | Risk | Probability | Impact | Owner | Primary mitigation | Release/operating gate |
|---|---|---|---|---|---|---|
| R-001 | Platform API access or app approval unavailable | High | High | Integrations lead | early eligibility audit, capability flags, authorized provider routes for organic | never claim executable support without eligible test evidence |
| R-002 | Connector behavior changes after platform release | High | High | Integrations lead | versioned adapters, capability refresh, contract/replay tests, policy review | disable affected mutation capability |
| R-003 | Cross-tenant data or tool access | Low | Critical | Security lead | scoped context, RLS, isolated agent workspaces, adversarial tests | zero tolerance; release blocker |
| R-004 | Agent causes unauthorized external action | Medium | Critical | Architecture/security | proposal-only tools, policy, approval, typed executors, kill switches | zero direct agent mutation paths |
| R-005 | Duplicate or uncertain paid/public action | Medium | High | Platform engineering | idempotency, reconcile-before-retry, conflict keys, saga state | unknown results stop blind retry |
| R-006 | Excess spend from stale or incorrect state | Medium | Critical | Paid operations | layered caps, fresh-spend preflight, approval, alerts, kill switch | increases blocked on stale data |
| R-007 | Optimizing vanity metrics harms lead/customer quality | High | High | Measurement lead | canonical qualified outcomes, CRM/revenue linkage, guardrails | metric contract approved before optimization |
| R-008 | Attribution interpreted as causality | High | High | Measurement lead | labeled attribution views, experiments/holdouts, uncertainty | reports distinguish observed/modeled |
| R-009 | Poor or stale business context | High | High | Product/agent owner | versioned context, source/confidence, review, corrections | material assumptions confirmed |
| R-010 | Creative contains unsupported claim or rights issue | Medium | Critical | Creative/compliance | claim registry, provenance, rights and human review | blocked until review passes |
| R-011 | Prompt injection or malicious retrieved content | High | High | Agent/security | untrusted classification, allowlisted tools, evals, no authority in content | adversarial suite passes |
| R-012 | Skill/model regression | High | High | Agent platform owner | versioned profiles, golden evals, canary and rollback | no critical regression |
| R-013 | Secrets/PII leak into prompts or logs | Medium | Critical | Security/privacy | managed secrets, minimization, redaction, DLP tests | zero critical leakage |
| R-014 | Legal or platform-policy violation | Medium | Critical | Compliance owner | policy registry, qualified review, provenance, platform gates | uncertain high-risk action blocked |
| R-015 | Organic provider dependency outage/feature gap | Medium | High | Publishing lead | native/provider abstraction, route health, reconciliation | fallback or clear degradation |
| R-016 | All-platform MVP expands delivery time | High | High | Product owner | shared contracts, parallel adapters, strict readiness definition, scope control elsewhere | do not reduce safety/measurement to meet date |
| R-017 | Weak lowest-common-denominator platform model | Medium | High | Architecture lead | common brief plus native extension schemas and specialists | platform-native acceptance tests |
| R-018 | Inconsistent partial multiplatform launch | Medium | High | Workflow owner | saga, independent approvals, compensation, recalculated budget | partial-state E2E tests |
| R-019 | Insufficient pilot outcome volume | Medium | High | Product/measurement | leading indicators labeled, longer window, multiple experiments, avoid premature autonomy | no unsupported performance claim |
| R-020 | User approves without understanding | Medium | High | UX/product | plain-language evidence, exact diff, cost/risk, step-up | usability and comprehension tests |
| R-021 | Notification failure hides action | Medium | Medium | Operations | durable inbox, independent retries, escalation | action state never depends on notification success |
| R-022 | External manual changes invalidate plans | High | Medium | Connector owner | continuous sync, origin marker, drift invalidation | preflight reread |
| R-023 | Model/tool cost becomes uneconomic | Medium | High | Product/operations | routing, budgets, caching, deterministic jobs, cost attribution | per-tenant/task budgets |
| R-024 | Backup or recovery is incomplete | Low | Critical | Operations | PITR, versioned objects, restore exercises | restore test before production |
| R-025 | Platform suspension interrupts client revenue | Medium | Critical | Platform/compliance | official access, policy monitoring, conservative mutation reliability, diversification | enforcement warning alert/disable |
| R-026 | Opportunity registry normalizes unsafe ideas | Medium | High | Compliance/product | explicit status, prohibited mechanism block, safer objective alternatives | no rejected tactic reaches proposal |
| R-027 | Over-automation degrades brand authenticity | Medium | High | Brand/creative owner | source briefs, native specialists, approval, correction memory | public-content evaluation |
| R-028 | Agency admin gains excessive client access | Medium | Critical | Security/product | explicit memberships and delegation; no implicit portfolio access | tenant tests and access review |

## Review cadence

- Critical/high risks: reviewed for every production release and material connector/agent change.
- All risks: reviewed monthly during pilot and quarterly thereafter.
- Incidents, policy changes, or new platform capabilities trigger immediate reassessment.

