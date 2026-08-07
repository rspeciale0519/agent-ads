"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { organicChannels, paidChannels, steps } from "./data";
import { StepPanels } from "./StepPanels";
import { Icon } from "./ui";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES, isAllowedUpload } from "../../lib/upload-rules";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { AttachmentStatus, FormData, initialFormData, OnboardingAttachment, OrganicChannel, PaidChannel, StepId } from "./types";

const STORAGE_KEY_PREFIX = "agent-ads-pilot-onboarding-draft";

type OnboardingFormProps = {
  applicantId: string;
  applicantEmail: string;
};

export default function OnboardingForm({ applicantId, applicantEmail }: OnboardingFormProps) {
  const [form, setForm] = useState<FormData>(initialFormData);
  const [stepIndex, setStepIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [complete, setComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const storageKey = useMemo(() => `${STORAGE_KEY_PREFIX}:${applicantId}`, [applicantId]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<FormData>;
        const attachments = Array.isArray(parsed.attachments) ? parsed.attachments.map((attachment) => ({ ...attachment, status: attachment.status === "uploaded" ? "uploaded" : "error", error: attachment.status === "uploaded" ? undefined : "Upload needs to be restarted." })) as OnboardingAttachment[] : [];
        setForm({ ...initialFormData, ...parsed, attachments });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    const storedSubmissionId = window.localStorage.getItem(`${storageKey}-id`) || crypto.randomUUID();
    window.localStorage.setItem(`${storageKey}-id`, storedSubmissionId);
    setSubmissionId(storedSubmissionId);
    setHydrated(true);
  }, [storageKey]);

  const currentStep = steps[stepIndex];
  const completion = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex]);

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  };

  const toggleChannel = (kind: "paid" | "organic", channel: PaidChannel | OrganicChannel) => {
    if (kind === "paid") {
      const next = form.paidChannels.includes(channel as PaidChannel) ? form.paidChannels.filter((item) => item !== channel) : [...form.paidChannels, channel as PaidChannel];
      setField("paidChannels", next);
      return;
    }
    const next = form.organicChannels.includes(channel as OrganicChannel) ? form.organicChannels.filter((item) => item !== channel) : [...form.organicChannels, channel as OrganicChannel];
    setField("organicChannels", next);
  };

  const goTo = (step: StepId) => {
    const index = steps.findIndex((item) => item.id === step);
    if (index >= 0) setStepIndex(index);
  };

  const validateStep = () => {
    if (currentStep.id === "business" && (!form.businessName.trim() || !form.website.trim())) return "Add the business name and website so we can understand your offer and market.";
    if (currentStep.id === "goals" && (!form.primaryGoal || !form.qualifiedOutcome.trim())) return "Choose a primary marketing outcome and define what a qualified result means.";
    if (currentStep.id === "channels" && form.paidChannels.length === 0 && form.organicChannels.length === 0) return "Select at least one paid media or organic content channel to continue.";
    return null;
  };

  const validateForm = () => {
    if (!form.businessName.trim() || !form.website.trim()) return "Add the business name and website so we can understand your offer and market.";
    if (!form.primaryGoal || !form.qualifiedOutcome.trim()) return "Choose a primary marketing outcome and define what a qualified result means.";
    if (form.paidChannels.length === 0 && form.organicChannels.length === 0) return "Select at least one paid media or organic content channel to continue.";
    if (form.attachments.some((attachment) => attachment.status !== "uploaded")) return "Wait for every file to finish uploading, or remove the file that needs attention.";
    return null;
  };

  const next = () => {
    const error = validateStep();
    if (error) {
      window.alert(error);
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const saveDraft = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(form));
    setSaved(true);
  };

  const updateAttachment = (id: string, patch: Partial<OnboardingAttachment>) => {
    setForm((previous) => ({ ...previous, attachments: previous.attachments.map((attachment) => attachment.id === id ? { ...attachment, ...patch } : attachment) }));
    setSaved(false);
  };

  const uploadAttachment = async (file: File, attachment: OnboardingAttachment) => {
    try {
      const response = await fetch("/api/onboarding/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId, fileName: file.name, contentType: file.type, size: file.size }) });
      const data = await response.json() as { bucket?: string; path?: string; token?: string; error?: string };
      if (!response.ok || !data.bucket || !data.path || !data.token) throw new Error(data.error || "Could not prepare the upload.");
      const { error } = await getSupabaseBrowser().storage.from(data.bucket).uploadToSignedUrl(data.path, data.token, file);
      if (error) throw new Error(error.message);
      updateAttachment(attachment.id, { storagePath: data.path, status: "uploaded", error: undefined });
    } catch (error) {
      updateAttachment(attachment.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed." });
    }
  };

  const handleFilesSelected = (fileList: FileList) => {
    setUploadError("");
    const availableSlots = MAX_UPLOAD_FILES - form.attachments.length;
    if (availableSlots <= 0) {
      setUploadError(`You can upload up to ${MAX_UPLOAD_FILES} files.`);
      return;
    }
    const selected = Array.from(fileList).slice(0, availableSlots);
    const invalid = selected.find((file) => file.size > MAX_UPLOAD_BYTES || !isAllowedUpload(file.name, file.type));
    if (invalid) {
      setUploadError(`${invalid.name} is not supported. Choose an approved file type up to ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    const queued = selected.map((file) => ({ file, attachment: { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, storagePath: "", status: "uploading" as AttachmentStatus } }));
    setForm((previous) => ({ ...previous, attachments: [...previous.attachments, ...queued.map(({ attachment }) => attachment)] }));
    setSaved(false);
    queued.forEach(({ file, attachment }) => { void uploadAttachment(file, attachment); });
  };

  const removeAttachment = (id: string) => {
    setForm((previous) => ({ ...previous, attachments: previous.attachments.filter((attachment) => attachment.id !== id) }));
    setSaved(false);
  };

  const submit = async () => {
    const error = validateForm();
    if (error) {
      setSubmitError(error);
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    const { attachments, ...formPayload } = form;
    try {
      const response = await fetch("/api/onboarding/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId, form: formPayload, attachments }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "We could not send your onboarding.");
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(`${storageKey}-id`);
      setComplete(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your onboarding. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentStep.id === "review") void submit();
    else next();
  };

  const signOut = async () => {
    await getSupabaseBrowser().auth.signOut();
    window.location.assign("/auth");
  };

  if (!hydrated) return <div className="loading-screen"><span className="loading-orb"><Icon name="spark" /></span><p>Preparing your marketing workspace…</p></div>;
  if (complete) return <SuccessState businessName={form.businessName} />;

  return <main className="onboarding-shell">
    <aside className="onboarding-sidebar">
      <div className="brand-lockup"><span className="brand-orb"><Icon name="spark" size={19} /></span><span>MioDio<span className="brand-dot">.</span></span></div>
      <div className="sidebar-intro"><span className="sidebar-kicker">Digital marketing pilot</span><h2>Let’s build your AI marketing system.</h2><p>We’ll use what you share to configure an AI agent-driven digital marketing system that understands your business, creates campaigns, publishes content, measures results, and keeps you in control.</p></div>
      <nav className="step-nav" aria-label="Onboarding progress">{steps.map((step, index) => <button type="button" key={step.id} className={`step-nav-item ${index === stepIndex ? "active" : ""} ${index < stepIndex ? "complete" : ""}`} onClick={() => index <= stepIndex && setStepIndex(index)} disabled={index > stepIndex}><span className="step-number">{index < stepIndex ? <Icon name="check" size={13} /> : step.eyebrow}</span><span>{step.label}</span></button>)}</nav>
      <div className="sidebar-footer"><span className="mini-avatar">M</span><span><strong>Prepared for your marketing team</strong><small>Private · takes about 8 minutes</small></span></div>
    </aside>
    <section className="onboarding-main">
      <header className="topbar"><div className="mobile-brand"><span className="brand-orb"><Icon name="spark" size={16} /></span>MioDio<span className="brand-dot">.</span></div><div className="topbar-actions"><span className="account-email">{applicantEmail}</span><button type="button" className="save-button" onClick={saveDraft}>{saved ? <><Icon name="check" size={15} /> Saved</> : "Save and finish later"}</button><button type="button" className="sign-out-button" onClick={() => void signOut()}>Sign out</button><button type="button" className="help-button" aria-label="Get help"><Icon name="help" size={18} /></button></div></header>
      <div className="main-content"><div className="progress-mobile"><span>Step {stepIndex + 1} of {steps.length}</span><div><span style={{ width: `${completion}%` }} /></div></div><form onSubmit={handleSubmit}><StepPanels form={form} activeStep={currentStep.id} setField={setField} toggleChannel={toggleChannel} goTo={goTo} onFilesSelected={handleFilesSelected} removeAttachment={removeAttachment} uploadError={uploadError} />{submitError && <p className="submit-error" role="alert">{submitError}</p>}<footer className="form-footer"><div className="footer-trust"><Icon name="lock" size={15} /><span>Your answers are private and used only to prepare your marketing workspace.</span></div><div className="footer-actions">{stepIndex > 0 && <button type="button" className="back-button" onClick={() => setStepIndex((index) => index - 1)}><Icon name="back" size={16} />Back</button>}{stepIndex < steps.length - 1 ? <button type="button" className="primary-button" onClick={next}>Continue <Icon name="arrow" size={16} /></button> : <button type="button" className="primary-button" onClick={() => void submit()} disabled={submitting}>{submitting ? "Sending…" : "Send onboarding"} {!submitting && <Icon name="arrow" size={16} />}</button>}</div></footer></form></div>
    </section>
  </main>;
}

function SuccessState({ businessName }: { businessName: string }) {
  return <main className="success-shell"><div className="success-card"><span className="success-orb"><Icon name="check" size={30} /></span><span className="eyebrow">Marketing brief received</span><h1>We’ve got what we need to begin.</h1><p>Thanks{businessName ? ` for telling us about ${businessName}` : " for sharing the details"}. We’ll use this information to configure your AI agent-driven digital marketing system, including its campaign, content, measurement, and approval workflows.</p><div className="success-next"><span><Icon name="spark" size={17} /></span><div><strong>What happens next</strong><small>We’ll review your marketing context and translate it into the first Business & Marketing Profile and campaign recommendations.</small></div></div><p className="success-footnote">Your onboarding is securely saved and the MioDio team has been notified.</p></div></main>;
}

export { paidChannels, organicChannels };
