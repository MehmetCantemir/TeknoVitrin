import Link from "next/link";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import ChatWidget from "@/components/ChatWidget";
import "./globals.css";

// Yazı tipleri derleme sırasında indirilir ve siteyle birlikte sunulur.
const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export const metadata = {
  title: "TeknoVitrin",
  description: "Laptop, masaüstü bilgisayar ve telefon vitrini",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${sora.variable} ${plex.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-mist/80 bg-frost/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-md bg-ink"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 50% 0%, var(--color-glacier), transparent 70%)",
                }}
              />
              <span className="font-display text-lg font-semibold tracking-tight">TeknoVitrin</span>
            </Link>
            <nav className="hidden gap-1 text-sm text-steel sm:flex">
              <NavLink href="/?kategori=laptop">Laptop</NavLink>
              <NavLink href="/?kategori=desktop">Masaüstü</NavLink>
              <NavLink href="/?kategori=phone">Telefon</NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-mist py-6 text-center text-xs text-steel">
          TeknoVitrin bir öğrenme projesidir. Ürünler ve fiyatlar örnek amaçlıdır.
        </footer>
        <ChatWidget />
      </body>
    </html>
  );
}

function NavLink({ href, children }) {
  return (
    <Link href={href} className="rounded-md px-3 py-1.5 transition-colors hover:bg-white hover:text-ink">
      {children}
    </Link>
  );
}
