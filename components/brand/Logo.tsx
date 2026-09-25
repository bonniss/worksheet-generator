// Logo Worksheet Genie: tờ worksheet + tia phép (đồng bộ với app/icon.svg).
export const PRODUCT_NAME = "Worksheet Genie";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wg-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#wg-logo-grad)" />
      <rect x="15" y="17" width="28" height="34" rx="5" fill="#fff" />
      <rect x="21" y="27" width="16" height="3.5" rx="1.75" fill="#A5B4FC" />
      <rect x="21" y="34" width="11" height="3.5" rx="1.75" fill="#A5B4FC" />
      <rect x="21" y="41" width="14" height="3.5" rx="1.75" fill="#A5B4FC" />
      <path
        d="M46 8c.9 5.2 3.8 8.1 9 9-5.2.9-8.1 3.8-9 9-.9-5.2-3.8-8.1-9-9 5.2-.9 8.1-3.8 9-9z"
        fill="#FDE68A" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round"
      />
    </svg>
  );
}
