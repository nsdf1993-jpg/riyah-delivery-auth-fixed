import { Wind, Phone, MapPin } from 'lucide-react';

export function Logo({ size = 'md', showText = true }: { size?: 'sm' | 'md' | 'lg'; showText?: boolean }) {
  const sizes = {
    sm: { box: 'h-9 w-9', icon: 18, title: 'text-sm', sub: 'text-[10px]' },
    md: { box: 'h-12 w-12', icon: 24, title: 'text-base', sub: 'text-xs' },
    lg: { box: 'h-16 w-16', icon: 32, title: 'text-xl', sub: 'text-sm' },
  };
  const s = sizes[size];
  return (
    <div className="flex items-center gap-3">
      <div className={`${s.box} flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lg shadow-brand-700/20`}>
        <Wind size={s.icon} strokeWidth={2.5} />
      </div>
      {showText && (
        <div className="leading-tight">
          <p className={`${s.title} font-extrabold text-ink-900 font-display`}>رياح الجنوب</p>
          <p className={`${s.sub} font-medium text-brand-600`}>للتوصيل السريع</p>
        </div>
      )}
    </div>
  );
}

export function OrderInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="truncate text-sm font-bold text-ink-800">{value}</p>
      </div>
    </div>
  );
}

export { Phone, MapPin };
