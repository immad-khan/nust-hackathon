import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-5xl font-light text-ink">
        This piece has slipped away
      </h1>
      <span className="hairline mx-auto mt-5 block w-20" />
      <p className="mt-5 text-sm text-ink-soft">
        The page you are looking for is no longer here — but there is plenty
        more to discover.
      </p>
      <Link
        href="/shop"
        className="mt-8 inline-block rounded-sm bg-gradient-to-r from-rose-deep to-rose px-7 py-4 text-[0.68rem] tracking-[0.24em] uppercase text-cream"
      >
        Back to the collection
      </Link>
    </div>
  );
}
