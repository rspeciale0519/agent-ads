import Link from "next/link";
import { redirect } from "next/navigation";
import { getAssuranceStatus } from "../../lib/auth/assurance";
import { isOrganizationAccessError, requireOrganizationContext } from "../../lib/auth/organization-context";
import { getDashboardData } from "../../lib/dashboard/dashboard-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
  return <main className="workspace-shell">
    <header className="workspace-header">
      <div><span className="eyebrow">Customer workspace</span><h1>{dashboard.organization.name}</h1><p className="workspace-muted">Your marketing setup, connection health, and next steps in one place.</p></div>
      <div className="workspace-header-actions"><span className="workspace-role">{dashboard.organization.role}</span><Link className="secondary-button" href="/onboarding">Onboarding</Link><Link className="secondary-button" href="/connections">Account Connections</Link>{["owner", "administrator"].includes(context.role) && <Link className="secondary-button" href="/settings/data">Data controls</Link>}</div>
    </header>
    <section className="workspace-grid" aria-label="Workspace overview">
      <article className="workspace-card workspace-card-wide"><div className="workspace-card-heading"><div><span className="eyebrow">Next up</span><h2>Keep your setup moving</h2></div><span className="workspace-count">{dashboard.nextActions.length} actions</span></div><div className="action-list">{dashboard.nextActions.map((action) => <Link className="action-row" key={action.href + action.title} href={action.href}><span><strong>{action.title}</strong><small>{action.owner === "you" ? "Your action" : "MioDio action"}</small></span><span className="action-priority">{action.priority === "high" ? "Priority" : "Open"} →</span></Link>)}</div></article>
      <article className="workspace-card"><span className="eyebrow">Security</span><h2>{assurance.aal === "aal2" ? "MFA protected" : "MFA setup needed"}</h2><p>{assurance.aal === "aal2" ? "Sensitive connection actions can be unlocked with a fresh step-up check." : "Owners and administrators must enroll MFA before authorizing or changing provider access."}</p><Link className="text-link" href="/security/mfa">Review security →</Link></article>
      <article className="workspace-card"><span className="eyebrow">Onboarding</span><h2>{dashboard.onboarding.status === "submitted" ? "Received" : dashboard.onboarding.status === "in_progress" ? "In progress" : "Not started"}</h2><p>{dashboard.onboarding.businessName ? `Business context for ${dashboard.onboarding.businessName} is saved.` : "Add business context so your marketing workspace starts with the right information."}</p><Link className="text-link" href="/onboarding">{dashboard.onboarding.status === "submitted" ? "Review onboarding →" : "Resume onboarding →"}</Link></article>
      <article className="workspace-card workspace-card-wide"><div className="workspace-card-heading"><div><span className="eyebrow">Account Connections</span><h2>{dashboard.connections.length ? `${dashboard.connections.length} systems tracked` : "Start with your systems"}</h2></div><span className="workspace-count">{dashboard.verifiedResourceCount} verified resources</span></div>{dashboard.connections.length ? <div className="connection-summary-list">{dashboard.connections.slice(0, 6).map((connection) => <Link className="connection-summary-row" href={`/connections/${connection.id}`} key={connection.id}><span><strong>{connection.provider}{connection.product ? ` · ${connection.product}` : ""}</strong><small>{connection.selectedResourceCount} of {connection.resourceCount} resources selected · {connection.nextAction}</small></span><span className={`status-pill status-${connection.status}`}>{formatStatus(connection.status)}</span></Link>)}</div> : <div className="workspace-empty"><p>Inventory Google, Meta, TikTok, Dubsado, WordPress, VideoAsk, and other systems without sending platform credentials.</p><Link className="primary-button" href="/connections/setup">Add an account system →</Link></div>}</article>
      <article className="workspace-card workspace-card-wide"><span className="eyebrow">Recent safe activity</span><h2>What changed</h2>{dashboard.recentActivity.length ? <ul className="activity-list">{dashboard.recentActivity.map((event, index) => <li key={`${event.createdAt}-${index}`}><span>{event.action}</span><small>{event.outcomeCode} · {formatDate(event.createdAt)}</small></li>)}</ul> : <p>No connection activity yet. Your setup history will appear here without provider tokens or raw diagnostics.</p>}</article>
      <article className="workspace-card workspace-card-wide"><div className="workspace-card-heading"><div><span className="eyebrow">Manual access routes</span><h2>{dashboard.manualInvitations.length ? `${dashboard.manualInvitations.length} tracked routes` : "No manual routes yet"}</h2></div><Link className="text-link" href="/connections/manual">Track invitation or export →</Link></div>{dashboard.manualInvitations.length ? <div className="connection-summary-list">{dashboard.manualInvitations.slice(0, 5).map((invitation) => <Link className="connection-summary-row" href="/connections/manual" key={invitation.id}><span><strong>{invitation.provider}</strong><small>{invitation.expectedPrincipal} · {invitation.verificationSource ?? "verification pending"}</small></span><span className="status-pill">{invitation.status.replaceAll("_", " ")}</span></Link>)}</div> : <p>WordPress, VideoAsk, organic accounts, asset sources, and approved Dubsado exports can be tracked without submitting a password or token.</p>}</article>
    </section>
    <footer className="workspace-footer"><span>Need help? MioDio will never ask for a platform password, MFA code, recovery code, private key, or browser cookie.</span><Link href="/connections">Open Account Connections</Link></footer>
  </main>;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
