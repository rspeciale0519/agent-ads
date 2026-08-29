import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AccessPendingPage() {
  return <main className="access-pending-shell"><section className="access-pending-card"><span className="eyebrow">Workspace access</span><h1>Your account is confirmed.</h1><p>Your MioDio organization invitation is still pending. Ask your owner or administrator to send an invitation to this confirmed email address.</p><div className="access-pending-actions"><Link className="primary-button" href="/onboarding">Continue onboarding</Link><Link className="text-link" href="/auth">Use another account →</Link></div></section></main>;
}
