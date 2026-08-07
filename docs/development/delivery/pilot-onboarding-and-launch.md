# Pilot Onboarding and Launch

## Purpose

Collect the business, account, data, risk, and operating context required to implement and validate the system using the first client without embedding pilot-specific assumptions into the product.

Phase 0 uses the [client onboarding form](../product/client-onboarding-form.md) as the default intake surface. Staff may supplement it with a review call, but the client should not need to answer the same questionnaire manually in chat or email.

## Business intake

- Legal and public business names.
- Website, locations, service regions, currencies, time zones, and languages.
- Products/services, pricing, margins, capacity, seasonality, and inventory constraints.
- Primary offer and conversion destination.
- Target customers, qualifiers, exclusions, sales cycle, and customer value.
- Competitors and differentiation.
- Current marketing team, vendors, workflows, and approval owners.
- Brand guidelines, voice, assets, approved/prohibited claims, testimonials, and regulated topics.

## Goals and measurement

- Primary business objective and period.
- Qualified lead/customer definition.
- Funnel stages and ownership.
- Revenue, pipeline, margin, retention, and offline outcomes available.
- Current targets and historical baselines.
- Attribution expectations and known blind spots.
- Minimum decision volume and acceptable learning budget.
- Guardrail and stop metrics.

## Paid platform inventory

For Meta, Google, Microsoft, LinkedIn, TikTok, Reddit, and X:

- advertiser/business account;
- account owner and administrator;
- developer/API eligibility;
- current campaigns and spend;
- currency/time zone;
- conversion/tracking configuration;
- audiences and data provenance;
- creative library;
- policy warnings or restrictions;
- test/sandbox account availability;
- read and mutation permission owners.

## Organic platform inventory

For LinkedIn, X, Instagram, TikTok, Facebook, YouTube, and Reddit:

- identity/page/channel/community and owner;
- publishing permissions;
- current cadence and formats;
- historical analytics;
- authorized provider connections;
- comment/reply expectations;
- community rules and disclosure requirements;
- existing scheduled content.

## Business systems

- CRM.
- Ecommerce, billing, or payment processor.
- Website analytics and tag manager.
- Call tracking and booking systems.
- Data warehouse and reporting.
- Email/SMS/outbound tools.
- DAM/file storage and creative tools.
- Identity provider and notification channels.

For each, record owner, environment, API/export capability, identifiers, data quality, retention, and permissions.

## Policy and risk workshop

Agree on:

- total, monthly, platform, and campaign budget caps;
- action risk classes and approvers;
- public-content approval rules;
- sensitive claims and data;
- audience/customer-list restrictions;
- permitted experimental posture;
- platform-policy decision owner;
- legal questions requiring qualified review;
- notification and incident escalation;
- global and connector kill-switch owners;
- retention, export, deletion, and offboarding.

## Technical readiness audit

- Account IDs and ownership verified.
- OAuth/developer apps and scopes available.
- Domain and conversion ownership verified.
- Webhooks/callback domains and privacy-policy requirements identified.
- Historical-data availability measured.
- CRM/revenue keys can link to marketing touchpoints.
- Media assets have rights/provenance.
- Time zone and currency conflicts documented.
- Platform capability matrix populated from current official sources.

## Launch stages and gates

### Read-only

- No external mutations.
- Reconcile data and validate context/metrics.
- Exit when quality and tenant/security checks pass.

### Shadow

- Agents generate recommendations and drafts.
- Humans record what they would do and why.
- Exit when recommendation/eval thresholds are met.

### Approved organic

- Exact variants require approval.
- Begin with low-risk content and verify receipts/analytics.
- Exit when publishing reliability and brand/policy review pass.

### Approved paid

- Start with a bounded real campaign/experiment selected by the pilot owner.
- Every mutation approved and reconciled.
- Exit when execution, audit, spend, attribution, and incident controls pass.

### Bounded autonomy

- Only evidence-qualified, reversible action classes.
- Explicit scope, cap, expiry, notifications, and kill switch.
- Not required to prove basic MVP functionality.

## Pilot acceptance evidence

- Signed business/metric/policy profile.
- Connection and capability inventory.
- Data reconciliation report.
- Agent eval report.
- Security and tenant test report.
- Organic and paid E2E execution records.
- Audit reconstruction.
- Incident/kill-switch exercise.
- User-journey usability results.
- Pilot outcome and lessons report.

## Offboarding

- Disable schedules and mutations.
- Revoke platform and provider credentials.
- Export requested data and audit records.
- Enforce retention/deletion obligations.
- Confirm no orphaned campaigns, content schedules, webhooks, or agent jobs.
