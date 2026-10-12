import Link from "next/link";
import { notFound } from "next/navigation";
import ProductImage from "@/components/ProductImage";
import ProductCard from "@/components/ProductCard";
import {
  CATEGORIES,
  SEGMENTS,
  formatPrice,
  getAllProducts,
  getProductBySlug,
  getSimilarProducts,
  toSpecRows,
} from "@/lib/products";

// Tüm ürün sayfalarını derleme sırasında önceden üretir.
export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return { title: product ? `${product.name} | TeknoVitrin` : "Ürün bulunamadı" };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const extra = product.officeFeatures ?? product.gamingFeatures;
  const extraTitle = product.officeFeatures ? "Ofis Özellikleri" : "Oyun Özellikleri";
  const similar = getSimilarProducts(product);

  return (
    <div className="space-y-10">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900">Ana sayfa</Link>
        {" / "}
        <Link href={`/?kategori=${product.category}`} className="hover:text-slate-900">
          {CATEGORIES[product.category]}
        </Link>
        {" / "}
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <section className="grid gap-8 md:grid-cols-2">
        <ProductImage product={product} size="lg" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {product.segment && (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">
                {SEGMENTS[product.segment]}
              </span>
            )}
            {product.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-slate-600">{product.description}</p>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-3xl font-extrabold">{formatPrice(product.price)}</span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                product.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {product.inStock ? "Stokta" : "Stokta yok"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SpecTable title="Teknik Özellikler" rows={toSpecRows(product.specs)} />
        {extra && <SpecTable title={extraTitle} rows={toSpecRows(extra)} />}
      </section>

      {similar.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Benzer ürünler</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SpecTable({ title, rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">{title}</h2>
      <dl className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-5 gap-4 px-5 py-2.5 text-sm">
            <dt className="col-span-2 text-slate-500">{row.label}</dt>
            <dd className="col-span-3 text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
