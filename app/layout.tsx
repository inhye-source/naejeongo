import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "내전 고?",
  description: "LoL 내전 팀 밸런싱 & 전적 분석",
};

const NAV = [
  { href: "/", label: "내전 만들기" },
  { href: "/players", label: "선수 관리" },
  { href: "/history", label: "히스토리" },
  { href: "/stats", label: "분석" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text antialiased">
        <header className="bg-[var(--header-bg)] shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="내전 고? 로고"
                className="h-9 w-9 shrink-0 object-contain"
              />
              <span className="text-xl font-bold text-white">
                내전 <span className="text-accent">고?</span>
              </span>
            </Link>
            <nav className="flex gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
