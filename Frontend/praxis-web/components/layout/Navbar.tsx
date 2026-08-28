"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
];

export function Navbar() {
  const { user, isInitializing, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink-900-solid">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm text-white">
            P
          </span>
          Praxis Tech Academy
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href ? "text-brand-700" : "text-ink-500 hover:text-ink-900-solid"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors ${
                pathname === "/admin" ? "text-brand-700" : "text-ink-500 hover:text-ink-900-solid"
              }`}
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isInitializing ? null : user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-ink-700 hover:text-ink-900-solid">
                {user.name.split(" ")[0]}
              </Link>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-ink-700 hover:text-ink-900-solid">
                Log in
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
