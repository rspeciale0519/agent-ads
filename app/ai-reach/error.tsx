"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="auth-shell"><section className="auth-card" role="alert"><span className="eyebrow">AI Reach</span><h1>Briefing unavailable</h1><p className="auth-intro">The briefing could not load. Your data was not changed.</p><button className="primary-button auth-submit" type="button" onClick={reset}>Try again</button></section></main>;
}
