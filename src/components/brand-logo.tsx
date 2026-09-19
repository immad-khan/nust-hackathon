import Link from "next/link";

export function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const scale = {
    sm: { text: "text-[0.52rem] sm:text-[0.58rem]", tracking: "tracking-[0.38em]" },
    md: { text: "text-[0.6rem] sm:text-[0.66rem]", tracking: "tracking-[0.42em]" },
    lg: { text: "text-[0.72rem] sm:text-[0.78rem]", tracking: "tracking-[0.45em]" },
  }[size];

  return (
    <Link
      href="/"
      className={`group inline-flex items-center select-none ${className}`}
    >
      <span className="flex items-center gap-1 transition-transform duration-300 group-hover:scale-[1.02]">
        <span
          className={`font-sans font-bold uppercase text-rose-deep/90 ${scale.tracking} ${scale.text}`}
        >
          Prem
        </span>
        <span
          className={`font-sans font-bold uppercase text-rose-deep/90 ${scale.tracking} ${scale.text}`}
        >
          BY SHK
        </span>
      </span>
    </Link>
  );
}
