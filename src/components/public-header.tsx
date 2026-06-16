import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";

export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6">
      <BrandMark />
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link to="/pricing" className="text-ink/70 hover:text-ink">Pricing</Link>
        <Link to="/how-it-works" className="text-ink/70 hover:text-ink">How it works</Link>
        <Link to="/about" className="text-ink/70 hover:text-ink">About</Link>
        <Link to="/auth" className="hidden text-ink/70 hover:text-ink sm:inline">Sign in</Link>
        <Link
          to="/auth"
          className="rounded-full bg-ink px-4 py-2 text-cream shadow-[0_8px_24px_-10px_rgba(40,25,15,0.6)] transition hover:opacity-90"
        >
          Host an event
        </Link>
      </nav>
    </header>
  );
}
