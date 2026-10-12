import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";
import "./globals.css";

export const metadata = {
  title: "TeknoVitrin",
  description: "Laptop, masaüstü bilgisayar ve telefon vitrini",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              Tekno<span className="text-blue-600">Vitrin</span>
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/?kategori=laptop" className="hover:text-slate-900">Laptop</Link>
              <Link href="/?kategori=desktop" className="hover:text-slate-900">Masaüstü</Link>
              <Link href="/?kategori=phone" className="hover:text-slate-900">Telefon</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          Bu site bir öğrenme projesidir; ürünler ve fiyatlar örnek amaçlıdır.
        </footer>
        <ChatWidget />
      </body>
    </html>
  );
}
