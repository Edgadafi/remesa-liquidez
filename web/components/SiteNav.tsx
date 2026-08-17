"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TiaLogo } from "@/components/TiaLogo";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/merchant", label: "Comercio" },
  { href: "/status", label: "Status" },
] as const;

export function SiteNav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const pathname = usePathname();

  return (
    <header className={`tia-nav tia-nav--${variant}`}>
      <TiaLogo variant={variant} href="/" height={36} />
      <nav aria-label="Principal">
        <ul className="tia-nav__links">
          {LINKS.map((item) => {
            const current =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="tia-nav__link"
                  aria-current={current ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
