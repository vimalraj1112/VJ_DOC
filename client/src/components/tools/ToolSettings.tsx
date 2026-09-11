import type { SettingField } from '@/lib/tools';
import { cn } from '@/lib/utils';
import { SectionLabel } from '@/components/ui/Card';

interface Options {
  [key: string]: string | number;
}

interface ToolSettingsProps {
  fields: SettingField[];
  values: Options;
  onChange: (key: string, value: string | number) => void;
  className?: string;
}

export function ToolSettings({ fields, values, onChange, className }: ToolSettingsProps) {
  if (!fields.length) return null;
  return (
    <div className={cn('grid gap-x-6 gap-y-5', className)}>
      {fields.map((field) => (
        <div key={field.key}>
          <SectionLabel>{field.label}</SectionLabel>
          <div className="mt-1.5">
            <Field field={field} value={values[field.key] ?? field.default} onChange={(v) => onChange(field.key, v)} />
          </div>
          {field.help && <p className="mt-1.5 text-xs text-faint">{field.help}</p>}
        </div>
      ))}
    </div>
  );
}

function Field({ field, value, onChange }: { field: SettingField; value: string | number; onChange: (v: string | number) => void }) {
  if (field.type === 'segmented') {
    return (
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {field.options!.map((opt) => {
          const active = String(value) === String(opt.value);
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === 'text') {
    return (
      <input
        type="text"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-faint focus:border-primary"
        aria-label={field.label}
        placeholder={`Enter ${field.label.toLowerCase()}`}
      />
    );
  }

  if (field.type === 'slider') {
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-primary"
          aria-label={field.label}
        />
        <span className="min-w-[3.5rem] rounded-lg bg-surface-2 px-2 py-1 text-center text-sm font-medium tabular-nums">
          {Number(value)}
          {field.suffix ?? ''}
        </span>
      </div>
    );
  }

  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const original = field.options!.find((o) => String(o.value) === raw);
        onChange(typeof original?.value === 'number' ? Number(raw) : raw);
      }}
      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
    >
      {field.options!.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}