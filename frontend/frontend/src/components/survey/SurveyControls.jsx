import { inputClass } from "./surveyStyles";

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-5 border-b border-slate-100 pb-3 text-lg font-bold text-slate-900">
        {title}
      </h2>

      {children}
    </section>
  );
}

export function Field({ label, required = false, description, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold leading-6 text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {description && (
        <p className="mb-2 text-xs leading-5 text-slate-400">{description}</p>
      )}

      {children}
    </div>
  );
}

export function NumberInput({ name, value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      step="1"
      name={name}
      value={value}
      onChange={onChange}
      className={inputClass}
      placeholder="0"
    />
  );
}

export function Radio({ name, value, checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />

      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

export function SummaryItem({ icon, title, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-green-600">{icon}</div>

      <div>
        <p className="text-xs font-bold uppercase text-slate-400">{title}</p>

        <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
      </div>
    </div>
  );
}
