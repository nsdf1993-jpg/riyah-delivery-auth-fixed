import type { ReactNode } from 'react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, DRIVER_STATUS_LABELS, DRIVER_STATUS_COLORS, type OrderStatus, type DriverStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${ORDER_STATUS_COLORS[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function DriverStatusBadge({ status }: { status: DriverStatus | 'expired' }) {
  if (status === 'expired') {
    return (
      <span className="status-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold bg-danger-100 text-danger-700 border-danger-200">
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        اشتراك منتهٍ
      </span>
    );
  }
  return (
    <span className={`status-badge inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${DRIVER_STATUS_COLORS[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {DRIVER_STATUS_LABELS[status]}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-card border border-ink-100 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm',
    secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700 shadow-sm',
    ghost: 'text-ink-600 hover:bg-ink-100',
    outline: 'border border-ink-300 text-ink-700 hover:bg-ink-50 bg-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  error,
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-bold text-ink-700">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition focus:outline-none focus:ring-2 focus:ring-brand-400 ${
          error ? 'border-danger-300 focus:ring-danger-300' : 'border-ink-200'
        }`}
      />
      {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  required,
  rows = 3,
  error,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  error?: string | null;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-bold text-ink-700">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={`w-full resize-none rounded-xl border bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition focus:outline-none focus:ring-2 focus:ring-brand-400 ${
          error ? 'border-danger-300 focus:ring-danger-300' : 'border-ink-200'
        }`}
      />
      {error && <p className="mt-1 text-xs font-medium text-danger-600">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-bold text-ink-700">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 transition focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        {icon}
      </div>
      <p className="text-base font-bold text-ink-700">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
    </div>
  );
}

export function Loading({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <span className="h-8 w-8 animate-spin rounded-full border-3 border-brand-200 border-t-brand-700" />
      <p className="mt-3 text-sm text-ink-500">{label}</p>
    </div>
  );
}

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const colors = {
    success: 'bg-success-500 text-white',
    error: 'bg-danger-600 text-white',
    info: 'bg-brand-700 text-white',
  };
  return (
    <div className="fixed inset-x-0 top-4 z-[100] mx-auto w-fit max-w-[92%] animate-slide-up">
      <div className={`flex items-center gap-3 rounded-xl px-5 py-3 shadow-elevated ${colors[type]}`}>
        <span className="text-sm font-bold">{message}</span>
        <button onClick={onClose} className="opacity-80 hover:opacity-100 text-lg leading-none">×</button>
      </div>
    </div>
  );
}
