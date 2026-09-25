// Logo Worksheet Genie: cô tiên hình chữ W — đầu ở đỉnh giữa, tay trái cầm tờ worksheet,
// tay phải vung đũa thần. Đồng bộ với app/icon.svg.
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
      <g transform="translate(32 33) scale(0.84) translate(-32 -33)">
        <g transform="rotate(-14 13 14)">
          <rect x="6" y="5" width="14" height="17" rx="2.5" fill="#fff" />
          <rect x="9" y="10" width="8" height="2" rx="1" fill="#A5B4FC" />
          <rect x="9" y="14" width="5.5" height="2" rx="1" fill="#A5B4FC" />
        </g>
        <path
          d="M16 23 L23.5 48 L32 32 L40.5 48 L48 23"
          fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="32" cy="21" r="4.8" fill="#fff" />
        <path d="M48 23 L53.5 12.5" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M54.5 4.5c.6 3.4 2.5 5.3 5.9 5.9-3.4.6-5.3 2.5-5.9 5.9-.6-3.4-2.5-5.3-5.9-5.9 3.4-.6 5.3-2.5 5.9-5.9z"
          fill="#FDE68A"
        />
      </g>
    </svg>
  );
}
