import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 19.5c1.3-3.4 4-5.2 7.2-5.2s5.9 1.8 7.2 5.2" />
    </svg>
  );
}

export function HeartIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8.1a4.1 4.1 0 0 1 7.5 2.5C19.5 15.6 12 20 12 20Z" />
    </svg>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9.2 8V6.6a2.8 2.8 0 0 1 5.6 0V8" />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </svg>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" />
    </svg>
  );
}

export function StarIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.2}
      {...props}
    >
      <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8L12 3.6Z" />
    </svg>
  );
}

export function GemIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 4h11l3 5-8.5 11L3.5 9l3-5Z" />
      <path d="M3.5 9h17M9 4l-1.5 5L12 20l4.5-11L15 4" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.5-6.5L16 8m-8 8-1.5 1.5m0-11L8 8m8 8 1.5 1.5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  );
}

export function BadgeCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Z" />
      <path d="m8.5 12.5 2.5 2.5 5-5" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" />
    </svg>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="9.5" width="16" height="10.5" rx="1.5" />
      <path d="M3 9.5h18M12 9.5V20" />
      <path d="M12 9.5S10.6 4 8.4 4a2.2 2.2 0 0 0 0 4.4M12 9.5S13.4 4 15.6 4a2.2 2.2 0 0 1 0 4.4" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.2 2.3 3.3 5 3.3 8s-1.1 5.7-3.3 8c-2.2-2.3-3.3-5-3.3-8s1.1-5.7 3.3-8Z" />
    </svg>
  );
}

export function ReturnIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
      <path d="M4 4v4h4" />
    </svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="16.8" cy="7.2" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 12a8 8 0 0 1-11.9 7L4 20l1.1-3.9A8 8 0 1 1 20 12Z" />
      <path d="M9.2 9.4c.4 2.3 2.6 4.5 5 5l1-1.4 1.7.8c-.3 1.1-1.3 1.5-2.3 1.4-2.9-.4-5.5-3-5.9-5.9-.1-1 .3-2 1.4-2.3l.8 1.7-1.7.7Z" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 8.5h2V5.5h-2a3.5 3.5 0 0 0-3.5 3.5v2H9v3h2v6h3v-6h2.2l.5-3H14v-1.6c0-.5.3-.9 1-.9Z" />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export const PROMISE_ICONS = {
  gem: GemIcon,
  lock: LockIcon,
  gift: GiftIcon,
  globe: GlobeIcon,
  return: ReturnIcon,
};
