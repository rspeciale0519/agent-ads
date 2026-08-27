"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrganizationSelector({ choices }: { choices: Array<{ id: string; name: string; role: string }> }) {
  const mutations = useMutationIdentityStore();
  const router = useRouter();
  const [error, setError] = useState("");
  const select = async (organizationId: string) => { setError(""); const response = await mutationFetch(mutations, `organization-select:${organizationId}`, "/api/v1/organizations/select", { method: "POST", body: JSON.stringify({ organizationId }) }); if (!response.ok) { setError("That workspace is no longer available."); return; } router.replace("/dashboard"); router.refresh(); };
  return <div className="organization-choice-list">{choices.map((choice) => <button className="organization-choice" type="button" key={choice.id} onClick={() => void select(choice.id)}><span><strong>{choice.name}</strong><small>{choice.role}</small></span><span>Continue →</span></button>)}{!choices.length && <p>No active organization memberships are available yet.</p>}{error && <p className="auth-message error" role="alert">{error}</p>}</div>;
}
