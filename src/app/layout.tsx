import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dynamify Scout",
  description: "Internal AI prospect-research and personalized-demo generation system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-ink-100 antialiased">
        <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col">
          <header className="flex items-center justify-between border-b border-ink-800 px-6 py-4">
            <a href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-600 text-sm font-bold text-white">
                D
              </span>
              <span className="text-sm font-semibold tracking-wide text-ink-50">
                Dynamify Scout
              </span>
            </a>
            <nav className="flex items-center gap-4 text-sm text-ink-300">
              <a href="/" className="hover:text-ink-50">
                Leads
              </a>
              <a href="/leads/new" className="hover:text-ink-50">
                New lead
              </a>
            </nav>
          </header>
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
