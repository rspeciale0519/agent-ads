# Risk Register

## Rating

Probability and impact are `low`, `medium`, `high`, or `critical`. Owners are roles until named individuals are assigned.

| ID | Risk | Probability | Impact | Owner | Primary mitigation | Release/operating gate |
|---|---|---|---|---|---|---|
| R-001 | Platform API access or app approval unavailable | High | High | Integrations lead | early eligibility audit, capability flags, authorized provider routes for organic | never claim executable support without eligible test evidence |
| R-002 | Connector behavior changes after platform release | High | High | Integrations lead | versioned adapters, capability refresh, contract/replay tests, policy review | disable affected mutation capability |
| R-003 | Cross-tenant data or tool access | Low | Critical | Security lead | scoped context, RLS, isolated agent workspaces, adversarial tests | zero tolerance; release blocker |
| R-004 | Agent causes unauthorized external action | Medium | Critical | Architecture/security | proposal-only tools, policy, approval, typed executors, kill switches | zero direct agent mutation paths |
| R-005 | Duplicate or uncertain paid/public action | Medium | High | Platform engineering | idempotency, provider-state reconciliation before every retry, conflict keys, saga state | unknown results stop blind retry |
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
| R-016 | Work expands beyond the approved pilot boundary | Medium | High | Product owner | Pilot Scope Record, gate ownership, expansion backlog, connector flags | no unlisted connector blocks release or receives credentials |
| R-017 | Weak lowest-common-denominator platform model | Medium | High | Architecture lead | common brief plus native extension schemas and specialists | platform-native acceptance tests |
| R-018 | Inconsistent partial multiplatform launch | Medium | High | Workflow owner | saga, independent approvals, compensation, recalculated budget | partial-state E2E tests |
| R-019 | Insufficient pilot outcome volume | Medium | High | Product/measurement | leading indicators labeled, longer window, multiple experiments, avoid premature autonomy | no unsupported performance claim |
| R-020 | User approves without understanding | Medium | High | UX/product | plain language, exact destination and change, cost, risk, expiry, rollback, step-up | usability and comprehension tests |
| R-021 | Notification failure hides action | Medium | Medium | Operations | durable inbox, independent retries, escalation | action state never depends on notification success |
| R-022 | External manual changes invalidate plans | High | Medium | Connector owner | continuous sync, origin marker, drift invalidation | preflight reread |
| R-023 | Model/tool cost becomes uneconomic | Medium | High | Product/operations | routing, budgets, caching, deterministic jobs, cost attribution | per-tenant/task budgets |
| R-024 | Backup or recovery is incomplete | Low | Critical | Operations | database recovery point, Storage objects, Vault key, roles, configuration, artifact, manifest, restore exercises | complete recovery-set restore before pilot |
| R-025 | Platform suspension interrupts client revenue | Medium | Critical | Platform/compliance | official access, policy monitoring, conservative mutation reliability, diversification | enforcement warning alert/disable |
| R-026 | Opportunity registry normalizes unsafe ideas | Medium | High | Compliance/product | explicit status, prohibited mechanism block, safer objective alternatives | no rejected tactic reaches proposal |
| R-027 | Over-automation degrades brand authenticity | Medium | High | Brand/creative owner | source briefs, native specialists, approval, correction memory | public-content evaluation |
| R-028 | Agency admin gains excessive client access | Medium | Critical | Security/product | explicit memberships and delegation; no implicit portfolio access | tenant tests and access review |
| R-029 | Customer-facing managed service, automation host, AWS region, or other infrastructure outage interrupts the product | Medium | High | Operations | durable handoffs, service health checks, backups, tested restore/DR, portable deployments, explicit degraded modes | production SLO/DR exercise and status communication |
| R-030 | Pooled client exhausts shared capacity or harms another tenant | Medium | High | Platform engineering | per-tenant quotas, concurrency controls, fair scheduling, cost limits, load tests | noisy-neighbor and tenant-fairness gates |
| R-031 | Dedicated deployments drift or become unpatchable | Medium | High | Platform engineering | shared infrastructure modules, immutable artifacts, conformance inventory, automated rollout/evidence | no unsupported configuration fork |
| R-032 | Client-owned AWS access or responsibility is ambiguous | Medium | High | Commercial/operations | least-privilege management role, responsibility matrix, break-glass and offboarding terms | signed account-ownership and access schedule |
| R-033 | Hybrid connector is unavailable, compromised, or stale | Medium | Critical | Security/operations | outbound mTLS, signed updates, narrow allowlists, expiry, health/audit reporting, remote disablement | connector conformance test and cloud fail-closed behavior |
| R-034 | Usage cost, pricing, or metering error erodes margin or overcharges a client | Medium | High | Product/finance | immutable usage ledger, price versions, allowances/limits, provider-cost reconciliation, invoice review | usage-to-invoice and margin reconciliation |
| R-035 | Hermes or a model provider creates lock-in or absorbs authority | Medium | Critical | Architecture/security | application-owned gateway, exportable/versioned artifacts and evals, proposal-only tools, vendor review, kill switches | Hermes containment, migration-readiness, and no-authority tests |
| R-036 | Delayed or incomplete pilot response stalls client-specific validation | High | Medium | Onboarding owner | parallel desk research, readiness workbook, explicit awaiting-client fields, focused clarification list | no assumption promoted to confirmed business or metric state |
| R-037 | App review, audit, contract, or account eligibility delays a pilot source | High | High | Integrations lead | focus on Google Ads, Meta Ads, and selected pilot systems; use documented tests and capability flags | release truthfully exposes external blocks and never uses an unauthorized route |
| R-038 | Publishing provider coverage claims hide platform, tenant, or reconciliation gaps | Medium | High | Publishing/security | native-first policy, provider security review, account-level contract tests, canonical receipts, kill switches | provider route cannot count as ready without end-to-end account evidence |
| R-039 | Self-hosted automation services become unpatched, under-provisioned, unrecoverable, or more expensive to operate than managed alternatives | Medium | High | Operations/platform engineering | reproducible containers, least privilege, budgets, capacity alerts, automated backups, restore drills, patch SLAs, vulnerability scans, total-cost reviews, managed-service escalation gates | no production self-hosted service without passing patch, backup/restore, capacity, security, and degraded-mode tests |
| R-040 | Migration history and live schema disagree | High | Critical | Database owner | target inventory, catalog comparison, fresh migration, forward repair | Gate F0 passes |
| R-041 | An operation targets the wrong database | Medium | Critical | Database/operations | target fingerprint, environment class, disposable-target marker, two-person production review | wrong-target guard passes |
| R-042 | AI Reach overstates search or AI evidence | High | High | Product/measurement | separate evidence classes, visible limits, no composite score, claims review | no ranking, citation, traffic, or causality promise |
| R-043 | AI answer samples are volatile or non-representative | High | High | Measurement/agent owner | versioned question set, repeated labeled samples, provider/method/locale/time metadata | provenance and limitations appear with every result |
| R-044 | A broad approval permits unintended spend, publishing, or contact | Medium | Critical | Security/product | action-bound AAL2 grant, exact account/destination, cap, expiry, drift invalidation | approval abuse tests pass |
| R-045 | A scheduled sync or observation stalls or repeats work | Medium | High | Operations | durable state, idempotency, freshness limits, backlog alerts, bounded retry | stale and duplicate-work tests pass |
| R-046 | Automated content becomes generic or violates scaled-content policies | Medium | High | Content/product | first-hand evidence, human value review, duplicate/thin checks, source and claim validation | CMS draft validation passes before approval |

## Review cadence

- Critical/high risks: reviewed for every production release and material connector/agent change.
- All risks: reviewed monthly during pilot and quarterly thereafter.
- Incidents, policy changes, or new platform capabilities trigger immediate reassessment.
