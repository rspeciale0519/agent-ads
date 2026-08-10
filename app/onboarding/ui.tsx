import { Children, cloneElement, isValidElement, type ChangeEvent, type ReactElement, type ReactNode } from "react";

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 3.8 1.9c-.9.6-1.5 1-1.5 2.1" /><path d="M12 17h.01" /></>,
    leaf: <><path d="M20 4C11 4 5 8 5 14c0 3.3 2.7 6 6 6 6 0 9-7 9-16Z" /><path d="M4 20c2.2-3.7 5.3-6.3 9.5-8.2" /></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}

type LabelledControlProps = {
  id?: string;
  name?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Field({ label, hint, fieldName, error, required = false, children }: { label: string; hint?: string; fieldName?: string; error?: string; required?: boolean; children: ReactNode }) {
  const fieldId = fieldName ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const errorId = `${fieldId}-error`;
  const labelId = `${fieldId}-label`;
  const labelable = Children.toArray(children).some((child) => isValidElement(child) && (child.type === TextInput || child.type === TextArea || child.type === "select"));
  const labelledChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === TextInput || child.type === TextArea || child.type === "select") {
      return cloneElement(child as ReactElement<LabelledControlProps>, { id: fieldId, name: fieldId, "aria-describedby": error ? errorId : undefined, "aria-invalid": Boolean(error) });
    }
    return child;
  });
  return <div className={`field ${error ? "field-invalid" : ""}`} data-validation-field={fieldName} role={labelable ? undefined : "group"} aria-labelledby={labelable ? undefined : labelId} aria-describedby={!labelable && error ? errorId : undefined} aria-invalid={!labelable ? Boolean(error) : undefined}><div className="field-heading">{labelable ? <label htmlFor={fieldId}>{label}</label> : <span id={labelId} className="field-label">{label}</span>}<span className="field-meta">{required && <span className="required-label">Required</span>}{hint && <span>{hint}</span>}</span></div>{labelledChildren}{error && <p id={errorId} className="field-error-message">{error}</p>}</div>;
}

export function TextInput({ value, onChange, placeholder, type = "text", id, name, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string; id?: string; name?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) {
  return <input id={id} name={name} type={type} value={value} placeholder={placeholder} aria-describedby={ariaDescribedBy} aria-invalid={ariaInvalid} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} />;
}

export function TextArea({ value, onChange, placeholder, rows = 4, maxLength, id, name, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid }: { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; maxLength?: number; id?: string; name?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) {
  return <textarea id={id} name={name} value={value} placeholder={placeholder} rows={rows} maxLength={maxLength} aria-describedby={ariaDescribedBy} aria-invalid={ariaInvalid} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)} />;
}

export function ChoiceCard({ selected, title, description, onClick, icon }: { selected: boolean; title: string; description: string; onClick: () => void; icon: string }) {
  return <button type="button" className={`choice-card ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}><span className="choice-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{description}</small></span><span className="choice-check">{selected && <Icon name="check" size={15} />}</span></button>;
}
