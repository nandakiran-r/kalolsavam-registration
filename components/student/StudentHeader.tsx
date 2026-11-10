import Link from "next/link";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import { COLLEGE_NAME, KALOLSAVAM_YEAR } from "@/lib/constants";

export function StudentHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="wrap flex h-[68px] items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ink/15 bg-ink text-[13px] font-extrabold tracking-[-0.04em] text-paper"
          >
            SJC
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold leading-tight text-ink sm:text-sm">
              {COLLEGE_NAME}
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Kalolsavam {KALOLSAVAM_YEAR} · Student portal
            </span>
          </span>
        </Link>

        {/* <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs font-semibold text-ink-soft sm:inline">
            One device · one registration
          </span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-ink/30 hover:bg-white"
          >
            <LockKey size={14} weight="bold" />
            Admin
          </Link>
        </div> */}
      </div>
    </header>
  );
}
