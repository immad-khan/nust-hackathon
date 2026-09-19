import { StarIcon } from "@/components/icons";

export function Stars({
  rating,
  className = "",
  size = "h-3.5 w-3.5",
}: {
  rating: number;
  className?: string;
  size?: string;
}) {
  const value = rating / 10;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <StarIcon key={step} className={size} filled={value >= step - 0.4} />
      ))}
    </span>
  );
}
