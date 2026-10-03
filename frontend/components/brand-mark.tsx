export const BRAND_NAME = 'Auralogic';

export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0F766E" />
      <path
        d="M8.5 23.5 16 8.5l7.5 15"
        fill="none"
        stroke="#F0FDFA"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M11.4 18.4h9.2" stroke="#5EEAD4" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLockup({ markClassName = 'h-8 w-8', className = '' }: { markClassName?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <BrandMark className={markClassName} />
      {BRAND_NAME}
    </span>
  );
}
