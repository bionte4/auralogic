export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        className="fill-primary-foreground"
        d="M8.8 8h13.1a1.45 1.45 0 0 1 0 2.9H12.2v2.35h7.35a1.45 1.45 0 0 1 0 2.9H12.2V24H8.8V8Z"
      />
      <path
        className="fill-none stroke-primary-foreground"
        d="M17.2 22.2c2.1 1.15 4.15 1.35 6.3.35"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
