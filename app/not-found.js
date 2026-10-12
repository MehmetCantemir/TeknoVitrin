import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Bu sayfa vitrinde yok</h1>
      <p className="mt-2 text-steel">Adres yanlış yazılmış ya da ürün kaldırılmış olabilir.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy">
        Vitrine dön
      </Link>
    </div>
  );
}
