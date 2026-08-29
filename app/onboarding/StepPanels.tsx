import { brandVoiceOptions, goalOptions } from "./step-data";
import { organicChannels, paidChannels } from "./data";
import { ChoiceCard, Field, Icon, TextArea, TextInput } from "./ui";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES } from "../../lib/upload-rules";
import { ONBOARDING_LONG_TEXT_MAX_LENGTH, type OnboardingValidationField, type OnboardingValidationIssue } from "../../lib/onboarding-schema";
import type { FormData, OrganicChannel, OnboardingAttachment, PaidChannel, StepId } from "./types";

type Props = {
  form: FormData;
  activeStep: StepId;
  setField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  toggleChannel: (kind: "paid" | "organic", channel: PaidChannel | OrganicChannel) => void;
  goTo: (step: StepId) => void;
  onFilesSelected: (files: FileList) => void;
  removeAttachment: (id: string) => void;
  uploadError: string;
  validationIssues: OnboardingValidationIssue[];
};

export function StepPanels({ form, activeStep, setField, toggleChannel, goTo, onFilesSelected, removeAttachment, uploadError, validationIssues }: Props) {
  const validationError = (field: OnboardingValidationField) => validationIssues.find((issue) => issue.field === field)?.message;
  const characterCount = (value: string) => `${value.length.toLocaleString()} / ${ONBOARDING_LONG_TEXT_MAX_LENGTH.toLocaleString()} characters`;

  return <div className="step-panels" data-active={activeStep}>
    <section className="step-panel" data-step="business">
      <div className="step-copy"><span className="eyebrow">Build the right foundation</span><h1>Give us the context behind your marketing.</h1><p>We use this context to configure your AI marketing agents: who they should reach, what you sell, and how your growth engine works.</p></div>
      <div className="form-grid two-col">
        <Field label="Business name" fieldName="businessName" required error={validationError("businessName")}><TextInput value={form.businessName} onChange={(value) => setField("businessName", value)} placeholder="e.g. MioDio HVAC" /></Field>
        <Field label="Website" fieldName="website" required error={validationError("website")} hint="Include https://"><TextInput type="url" value={form.website} onChange={(value) => setField("website", value)} placeholder="https://yourcompany.com" /></Field>
      </div>
      <Field label="What do you sell and who is it for?" fieldName="description" error={validationError("description")} hint={`Plain English · ${characterCount(form.description)}`}><TextArea value={form.description} onChange={(value) => setField("description", value)} placeholder="We help ..." maxLength={ONBOARDING_LONG_TEXT_MAX_LENGTH} /></Field>
      <div className="form-grid two-col">
        <Field label="Markets and service areas" fieldName="locations" error={validationError("locations")}><TextInput value={form.locations} onChange={(value) => setField("locations", value)} placeholder="Cities, regions, or worldwide" /></Field>
        <Field label="Business model" fieldName="businessModel" error={validationError("businessModel")}><select value={form.businessModel} onChange={(event) => setField("businessModel", event.target.value as FormData["businessModel"])}><option value="">Choose one</option><option value="B2B">B2B</option><option value="B2C">B2C</option><option value="B2B2C">B2B2C</option><option value="Other">Other</option></select></Field>
      </div>
      <div className="soft-note"><span className="soft-note-icon"><Icon name="spark" size={16} /></span><span><strong>This becomes your marketing brief.</strong> Your answers shape targeting, messaging, and campaign recommendations.</span></div>
    </section>

    <section className="step-panel" data-step="goals">
      <div className="step-copy"><span className="eyebrow">Define the growth target</span><h1>What should marketing accomplish next?</h1><p>Your goals become the operating targets for the AI agents that plan campaigns, recommend budgets, and measure performance.</p></div>
      <Field label="Primary marketing outcome" fieldName="primaryGoal" required error={validationError("primaryGoal")}><div className="choice-grid goal-grid">{goalOptions.map((goal) => <ChoiceCard key={goal.value} selected={form.primaryGoal === goal.value} title={goal.title} description={goal.description} icon={goal.icon} onClick={() => setField("primaryGoal", goal.value)} />)}</div></Field>
      <div className="form-grid two-col">
        <Field label="What are you promoting and who is the priority audience?" fieldName="goalDetails" error={validationError("goalDetails")} hint={characterCount(form.goalDetails)}><TextArea value={form.goalDetails} onChange={(value) => setField("goalDetails", value)} placeholder="For example: book 30 more qualified demos from operations leaders without increasing our current cost per opportunity." rows={5} maxLength={ONBOARDING_LONG_TEXT_MAX_LENGTH} /></Field>
        <div className="stack-fields"><Field label="Approximate monthly media budget" fieldName="monthlyBudget" error={validationError("monthlyBudget")} hint="A range is fine"><TextInput value={form.monthlyBudget} onChange={(value) => setField("monthlyBudget", value)} placeholder="$5,000–$10,000" /></Field><Field label="What counts as a qualified lead or conversion?" fieldName="qualifiedOutcome" required error={validationError("qualifiedOutcome")}><TextInput value={form.qualifiedOutcome} onChange={(value) => setField("qualifiedOutcome", value)} placeholder="e.g. booked demo with 20+ employee company" /></Field><Field label="Typical sales cycle" fieldName="salesCycle" error={validationError("salesCycle")}><TextInput value={form.salesCycle} onChange={(value) => setField("salesCycle", value)} placeholder="e.g. 14 days, or same-day purchase" /></Field></div>
      </div>
    </section>

    <section className="step-panel" data-step="channels">
      <div className="step-copy"><span className="eyebrow">Choose the media mix</span><h1>Where should we run campaigns and publish?</h1><p>Your channel choices tell the AI system where it can advertise, publish content, test creative, and learn over the next 90 days.</p></div>
      <div className={validationError("paidChannels") || validationError("organicChannels") ? "validation-group field-invalid" : "validation-group"} data-validation-field={validationError("organicChannels") ? "organicChannels" : "paidChannels"}>
        <div className="channel-section"><div className="section-heading"><div><span className="section-kicker">Paid media</span><h2>Where should we run ads?</h2></div><span className="selection-count">{form.paidChannels.length} selected</span></div><div className="channel-grid">{paidChannels.map((channel) => <button type="button" key={channel.name} className={`channel-card ${form.paidChannels.includes(channel.name) ? "selected" : ""}`} onClick={() => toggleChannel("paid", channel.name)} aria-pressed={form.paidChannels.includes(channel.name)}><span className={`channel-mark ${channel.accent}`}>{channel.name.split(" ")[0].slice(0, 1)}</span><span><strong>{channel.name}</strong><small>{channel.hint}</small></span>{form.paidChannels.includes(channel.name) && <Icon name="check" size={16} />}</button>)}</div></div>
        <div className="channel-section"><div className="section-heading"><div><span className="section-kicker">Organic content</span><h2>Where should we publish?</h2></div><span className="selection-count">{form.organicChannels.length} selected</span></div><div className="channel-grid">{organicChannels.map((channel) => <button type="button" key={channel.name} className={`channel-card ${form.organicChannels.includes(channel.name) ? "selected" : ""}`} onClick={() => toggleChannel("organic", channel.name)} aria-pressed={form.organicChannels.includes(channel.name)}><span className={`channel-mark ${channel.accent}`}>{channel.name.slice(0, 1)}</span><span><strong>{channel.name}</strong><small>{channel.hint}</small></span>{form.organicChannels.includes(channel.name) && <Icon name="check" size={16} />}</button>)}</div></div>
        {(validationError("paidChannels") || validationError("organicChannels")) && <p className="field-error-message">{validationError("paidChannels") || validationError("organicChannels")}</p>}
      </div>
      <div className="secure-callout"><Icon name="lock" size={17} /><span><strong>We never collect ad account or platform passwords here.</strong> Accounts are connected later through secure, authorized sign-in links.</span></div>
    </section>

    <section className="step-panel" data-step="brand">
      <div className="step-copy"><span className="eyebrow">Shape the brand system</span><h1>What should your ads and content sound like?</h1><p>Your voice and assets become the guardrails the creative and content agents use to produce on-brand ads, posts, hooks, captions, and landing-page messaging.</p></div>
      <Field label="Choose the closest brand voice" fieldName="brandVoice" error={validationError("brandVoice")}><div className="choice-grid voice-grid">{brandVoiceOptions.map((voice) => <ChoiceCard key={voice.value} selected={form.brandVoice === voice.value} title={voice.title} description={voice.description} icon={voice.icon} onClick={() => setField("brandVoice", voice.value)} />)}</div></Field>
      <div className="form-grid two-col"><Field label="Claims, topics, or language to avoid in ads and content" fieldName="prohibitedTopics" error={validationError("prohibitedTopics")} hint={characterCount(form.prohibitedTopics)}><TextArea value={form.prohibitedTopics} onChange={(value) => setField("prohibitedTopics", value)} placeholder="Anything sensitive, regulated, off-brand, or simply not you." maxLength={ONBOARDING_LONG_TEXT_MAX_LENGTH} /></Field><Field label="What creative assets already exist?" fieldName="existingAssets" error={validationError("existingAssets")} hint={characterCount(form.existingAssets)}><TextArea value={form.existingAssets} onChange={(value) => setField("existingAssets", value)} placeholder="Brand guide, logos, product photos, customer stories, video library, etc." maxLength={ONBOARDING_LONG_TEXT_MAX_LENGTH} /></Field></div>
      <div className="upload-heading"><div><span className="section-kicker">Business files</span><h2>Share useful marketing context</h2></div><span className="selection-count">{form.attachments.length}/{MAX_UPLOAD_FILES}</span></div>
      <p className="upload-help">Optional: add a logo, business plan, brand guide, product sheet, case study, or exported advertising data such as keyword lists, search terms, campaigns, and performance reports. Never upload passwords, credential exports, cookies, private keys, API tokens, or MFA/recovery codes. Files remain private and quarantined for review before any approved use.</p>
      <label className={`upload-card ${validationError("attachments") ? "field-invalid" : ""}`} data-validation-field="attachments" htmlFor="brand-assets"><input id="brand-assets" name="brand-assets" type="file" multiple accept={ACCEPT_ATTRIBUTE} onChange={(event) => { if (event.currentTarget.files) onFilesSelected(event.currentTarget.files); event.currentTarget.value = ""; }} /><span className="upload-icon"><Icon name="upload" /></span><span><strong>Drop your business files here</strong><small>PDF, Word, Excel, CSV, PowerPoint, images, and video · up to {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB each</small></span><span className="upload-action">Browse files</span></label>
      {uploadError && <p className="upload-error-message" role="alert">{uploadError}</p>}
      {validationError("attachments") && <p className="field-error-message">{validationError("attachments")}</p>}
      {form.attachments.length > 0 && <div className="upload-list" aria-live="polite">{form.attachments.map((attachment) => <AttachmentRow key={attachment.id} attachment={attachment} onRemove={() => removeAttachment(attachment.id)} />)}</div>}
    </section>

    <section className="step-panel" data-step="systems">
      <div className="step-copy"><span className="eyebrow">Close the measurement loop</span><h1>How will we know the marketing is working?</h1><p>These systems give the measurement and approval agents the evidence they need to connect spend, content, leads, and revenue while keeping execution authorized.</p></div>
      <div className="form-grid two-col"><Field label="CRM or lead system" fieldName="crm" error={validationError("crm")}><select value={form.crm} onChange={(event) => setField("crm", event.target.value)}><option value="">Choose one</option><option>HubSpot</option><option>Salesforce</option><option>Pipedrive</option><option>Close</option><option>Other</option><option>None yet</option></select></Field><Field label="Web analytics" fieldName="analytics" error={validationError("analytics")}><select value={form.analytics} onChange={(event) => setField("analytics", event.target.value)}><option value="">Choose one</option><option>Google Analytics</option><option>PostHog</option><option>Segment</option><option>Other</option><option>Not sure</option></select></Field><Field label="Revenue or commerce source" fieldName="revenueSource" error={validationError("revenueSource")}><select value={form.revenueSource} onChange={(event) => setField("revenueSource", event.target.value)}><option value="">Choose one</option><option>Stripe</option><option>Shopify</option><option>QuickBooks</option><option>Our CRM</option><option>Other</option><option>Not tracked yet</option></select></Field><Field label="Who approves campaigns, creative, and budget changes?" fieldName="teamApprovers" error={validationError("teamApprovers")} hint="Names or roles"><TextInput value={form.teamApprovers} onChange={(value) => setField("teamApprovers", value)} placeholder="e.g. Maya (owner), Jordan (marketing)" /></Field></div>
      <div className="connection-preview"><div className="connection-orb"><Icon name="leaf" size={22} /></div><div><strong>Connections happen after this form.</strong><p>We’ll send secure links for each ad account, social profile, analytics property, and CRM. Credentials stay out of email, forms, and agent conversations.</p></div><span className="status-chip">Secure by design</span></div>
      <Field label="Anything about your current marketing we should know?" fieldName="notes" error={validationError("notes")}><TextArea value={form.notes} onChange={(value) => setField("notes", value)} placeholder="Upcoming launches, seasonality, channel constraints, a recent win, or a problem you want us to diagnose first." rows={5} /></Field>
    </section>

    <section className="step-panel" data-step="review">
      <div className="step-copy"><span className="eyebrow">Review your marketing brief</span><h1>Ready to configure your AI marketing team?</h1><p>Review the inputs we’ll use to build your AI agent-driven digital marketing system. You can jump back to any section before sending.</p></div>
      <div className="review-list"><ReviewRow label="Business & offer" value={form.businessName || "Not answered yet"} detail={form.website} onClick={() => goTo("business")} /><ReviewRow label="Primary outcome" value={goalOptions.find((goal) => goal.value === form.primaryGoal)?.title ?? "Not answered yet"} detail={form.qualifiedOutcome} onClick={() => goTo("goals")} /><ReviewRow label="Paid + organic channels" value={`${form.paidChannels.length} paid · ${form.organicChannels.length} organic selected`} detail={[...form.paidChannels, ...form.organicChannels].slice(0, 4).join(", ")} onClick={() => goTo("channels")} /><ReviewRow label="Creative direction" value={brandVoiceOptions.find((voice) => voice.value === form.brandVoice)?.title ?? "Not answered yet"} detail={`${form.attachments.length} file${form.attachments.length === 1 ? "" : "s"} · assets and guardrails included`} onClick={() => goTo("brand")} /><ReviewRow label="Measurement & approvals" value={form.crm || "No CRM selected"} detail={form.teamApprovers || "Approvers still to be confirmed"} onClick={() => goTo("systems")} /></div>
      <div className="submit-preview"><span className="submit-preview-icon"><Icon name="spark" /></span><div><strong>What happens next</strong><p>We’ll turn this into your Business & Marketing Profile, configure the first AI agent workflows, flag missing context, and send secure connection links for the accounts you choose to activate.</p></div></div>
    </section>
  </div>;
}

function ReviewRow({ label, value, detail, onClick }: { label: string; value: string; detail: string; onClick: () => void }) {
  return <button type="button" className="review-row" onClick={onClick}><span className="review-label">{label}</span><span className="review-value"><strong>{value}</strong><small>{detail}</small></span><span className="review-edit">Edit</span></button>;
}

function AttachmentRow({ attachment, onRemove }: { attachment: OnboardingAttachment; onRemove: () => void }) {
  return <div className={`upload-item ${attachment.status}`}><span className="upload-item-icon"><Icon name={attachment.status === "uploaded" ? "check" : attachment.status === "error" ? "plus" : "upload"} size={15} /></span><span className="upload-item-copy"><strong>{attachment.name}</strong><small>{formatFileSize(attachment.size)} · {attachment.status === "uploaded" ? "Ready to send" : attachment.status === "error" ? attachment.error ?? "Upload failed" : "Uploading…"}</small></span><button type="button" className="upload-remove" onClick={onRemove}>Remove</button></div>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
