/**
 * KudoSpot brand icon — v3 version
 * (Stacked white cards on purple gradient background).
 */
const KudoSpotIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="kudospot-bg-v3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7C3AED" />
        <stop offset="1" stopColor="#5B21B6" />
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="56.32" fill="url(#kudospot-bg-v3)" />
    <g transform="translate(14.4128 14.4128) scale(4.7328)">
      <rect x="16" y="6" width="24" height="16" rx="5" fill="#FFFFFF" opacity="0.3" />
      <rect x="10" y="14" width="24" height="16" rx="5" fill="#FFFFFF" opacity="0.6" />
      <rect x="4" y="22" width="28" height="18" rx="6" fill="#FFFFFF" />
      <polygon
        points="18.00,26.00 19.32,29.18 22.76,29.45 20.14,31.70 20.94,35.05 18.00,33.25 15.06,35.05 15.86,31.70 13.24,29.45 16.68,29.18"
        fill="#7C3AED"
      />
    </g>
  </svg>
);

export default KudoSpotIcon;
