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

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const labelable = Children.toArray(children).some((child) => isValidElement(child) && (child.type === TextInput || child.type === TextArea || child.type === "select"));
  const labelledChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === TextInput || child.type === TextArea || child.type === "select") {
      return cloneElement(child as ReactElement<{ id?: string; name?: string }>, { id: fieldId, name: fieldId });
    }
    return child;
  });
  return <div className="field"><div className="field-heading">{labelable ? <label htmlFor={fieldId}>{label}</label> : <span className="field-label">{label}</span>}{hint && <span>{hint}</span>}</div>{labelledChildren}</div>;
}

export function TextInput({ value, onChange, placeholder, type = "text", id, name }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string; id?: string; name?: string }) {
  return <input id={id} name={name} type={type} value={value} placeholder={placeholder} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} />;
}

export function TextArea({ value, onChange, placeholder, rows = 4, id, name }: { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; id?: string; name?: string }) {
  return <textarea id={id} name={name} value={value} placeholder={placeholder} rows={rows} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)} />;
}

export function ChoiceCard({ selected, title, description, onClick, icon }: { selected: boolean; title: string; description: string; onClick: () => void; icon: string }) {
  return <button type="button" className={`choice-card ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}><span className="choice-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{description}</small></span><span className="choice-check">{selected && <Icon name="check" size={15} />}</span></button>;
}
