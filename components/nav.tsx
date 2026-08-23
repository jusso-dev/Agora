"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

const links = [
  { href: "/", label: "Library" },
  { href: "/docs", label: "Connect" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-neutral-900 text-xs text-white">
            A
          </span>
          Agora
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                pathname === link.href
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            href="/new"
            className="rounded-lg bg-neutral-900 px-3 py-1.5 font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Publish
          </Link>
          {session?.user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-neutral-500 sm:inline">{session.user.name}</span>
              <button
                onClick={() =>
                  signOut({ fetchOptions: { onSuccess: () => router.push("/") } })
                }
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
