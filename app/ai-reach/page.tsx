import Link from "next/link";
import { redirect } from "next/navigation";
import { getAssuranceStatus } from "../../lib/auth/assurance";
import { isOrganizationAccessError, requireOrganizationContext } from "../../lib/auth/organization-context";
import { getDashboardData } from "../../lib/dashboard/dashboard-service";
import { buildAiReachBriefing } from "../../lib/ai-reach/briefing";
import AiReachChat from "./AiReachChat";

export const dynamic = "force-dynamic";

export default async function AiReachPage() {
  let context;
  try {
    context = await requireOrganizationContext();
  } catch (error) {
    if (isOrganizationAccessError(error)) {
      if (error.code === "AUTHENTICATION_REQUIRED") redirect("/auth");
      if (error.code === "ORGANIZATION_SELECTION_REQUIRED") redirect("/organizations/select");
      redirect("/access-pending");
    }
    throw error;
  }
  const [dashboard, assurance] = await Promise.all([getDashboardData(context), getAssuranceStatus(context)]);
  const briefing = buildAiReachBriefing(dashboard);
  return <main className="workspace-shell ai-reach-shell">
    <header className="workspace-header ai-reach-header">
      <div><span className="eyebrow">AI Reach</span><h1>Know what to do next.</h1><p className="workspace-muted">A plain-language view of your marketing evidence, business outcomes, and the next three safe actions.</p></div>
      <div className="workspace-header-actions"><span className={`ai-reach-status ai-reach-status-${briefing.status}`}>{briefing.status === "ready" ? "Evidence ready" : "Evidence is limited"}</span><Link className="secondary-button" href="/dashboard">Workspace</Link><Link className="secondary-button" href="/connections">Connections</Link></div>
    </header>
    <section className="ai-reach-summary" aria-label="AI Reach briefing">
      <div><span className="eyebrow">Today’s briefing</span><h2>{briefing.summary}</h2><p>{briefing.limitation}</p><p>AI Reach does not change advertising, websites, email, or CRM records.</p></div>
      <div className="ai-reach-metrics" aria-label="Connection summary"><div><strong>{briefing.sources.filter((source) => source.state === "connected").length}</strong><span>sources with recorded access</span></div><div><strong>{dashboard.verifiedResourceCount}</strong><span>selected eligible resources</span></div><div><strong>3</strong><span>setup actions</span></div></div>
    </section>
    <section className="ai-reach-outcomes" aria-label="Outcome snapshot"><div className="ai-reach-outcome"><span>Primary outcome</span><strong>Needs confirmation</strong><small>An approved outcome is not available in this view</small></div><div className="ai-reach-outcome"><span>Qualified meetings</span><strong>Not measured</strong><small>Approved meeting evidence is not available here</small></div><div className="ai-reach-outcome"><span>Signed engagements</span><strong>Not measured</strong><small>Approved engagement evidence is not available here</small></div><div className="ai-reach-outcome"><span>Booked revenue</span><strong>Not measured</strong><small>Approved revenue evidence is not available here</small></div></section>
    <section className="ai-reach-grid" aria-label="AI Reach workspace">
      <article className="workspace-card ai-reach-chat-card"><div className="workspace-card-heading"><div><span className="eyebrow">Ask AI Reach</span><h2>Start with a simple question</h2></div><span className="ai-reach-readonly">Read-only</span></div><AiReachChat organizationName={dashboard.organization.name} briefing={briefing} /></article>
      <article className="workspace-card ai-reach-sources-card"><div className="workspace-card-heading"><div><span className="eyebrow">Source access</span><h2>Connection records</h2></div><span className="workspace-count">{briefing.sources.length} sources</span></div><div className="ai-reach-source-list">{briefing.sources.map((source) => <div className="ai-reach-source" key={source.name}><span className={`ai-reach-source-dot ai-reach-source-${source.state}`} aria-hidden="true" /><div><strong>{source.name}</strong><small>{source.detail}</small></div><span className="ai-reach-source-state">{source.state === "connected" ? "Recorded" : source.state === "needs_review" ? "Review" : "Missing"}</span></div>)}</div><p className="ai-reach-note">{assurance.aal === "aal2" ? "Your account has MFA protection." : "Set up MFA before authorizing a connection."}</p></article>
    </section>
    <section className="workspace-card ai-reach-recommendations" aria-labelledby="ai-reach-recommendations-heading"><div className="workspace-card-heading"><div><span className="eyebrow">Three actions</span><h2 id="ai-reach-recommendations-heading">The safest next moves</h2></div><span className="ai-reach-approval-note">Approval required before action</span></div><div className="ai-reach-recommendation-list">{briefing.recommendations.map((recommendation, index) => <article className="ai-reach-recommendation" key={recommendation.id}><div className="ai-reach-recommendation-index">0{index + 1}</div><div className="ai-reach-recommendation-copy"><h3>{recommendation.title}</h3><p>{recommendation.reason}</p><ul>{recommendation.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul><div className="ai-reach-recommendation-meta"><span>Effect: {recommendation.expectedEffect}</span><span>Effort: {recommendation.effort}</span><span>Risk: {recommendation.risk}</span><span>{recommendation.approval}</span></div></div></article>)}</div></section>
    <footer className="workspace-footer"><span>AI Reach shows uncertainty when evidence is missing, stale, or unapproved.</span><Link href="/connections">Review data sources →</Link></footer>
  </main>;
}
