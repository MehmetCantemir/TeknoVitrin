import Link from "next/link";
import { notFound } from "next/navigation";
import ProductImage, { lightFor } from "@/components/ProductImage";
import ProductCard from "@/components/ProductCard";
import AskAboutButton from "@/components/AskAboutButton";
import {
  CATEGORIES,
  SEGMENTS,
  formatPrice,
  getAllProducts,
  getProductBySlug,
  getSimilarProducts,
  keySpecs,
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
  const extraTitle = product.officeFeatures ? "Ofis özellikleri" : "Oyun özellikleri";
  const similar = getSimilarProducts(product);

  return (
    <div className="space-y-12">
      <nav aria-label="Konum" className="text-sm text-steel">
        <Link href="/" className="hover:text-ink">Vitrin</Link>
        <span className="mx-2 text-mist">/</span>
        <Link href={`/?kategori=${product.category}`} className="hover:text-ink">
          {CATEGORIES[product.category]}
        </Link>
        <span className="mx-2 text-mist">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <section className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductImage product={product} size="lg" />

        <div className="flex flex-col">
          <p className="flex items-center gap-2 text-sm text-steel">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: lightFor(product) }} />
            {product.brand}
            {product.segment && `, ${SEGMENTS[product.segment].toLocaleLowerCase("tr")} serisi`}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 max-w-prose leading-relaxed text-steel">{product.description}</p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {keySpecs(product).map((spec) => (
              <li key={spec} className="rounded-md border border-mist bg-white px-2.5 py-1 text-sm text-ink">
                {spec}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-baseline gap-4 border-t border-mist pt-6">
            <span className="font-display text-4xl font-semibold tracking-tight">
              {formatPrice(product.price)}
            </span>
            <span className={`text-sm font-medium ${product.inStock ? "text-fjord" : "text-steel"}`}>
              {product.inStock ? "Stokta" : "Stokta yok"}
            </span>
          </div>

          <AskAboutButton productName={product.name} />

          <p className="mt-6 text-sm text-steel">
            {product.tags.map((tag) => `#${tag}`).join("  ")}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SpecTable title="Teknik özellikler" rows={toSpecRows(product.specs)} />
        {extra && <SpecTable title={extraTitle} rows={toSpecRows(extra)} />}
      </section>

      {similar.length > 0 && (
        <section className="space-y-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Benzer ürünler</h2>
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
    <div className="rounded-xl border border-mist bg-white">
      <h2 className="px-5 pb-2 pt-4 font-display font-semibold">{title}</h2>
      <dl className="px-5 pb-3">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-5 gap-4 border-t border-frost py-2.5 text-sm">
            <dt className="col-span-2 text-steel">{row.label}</dt>
            <dd className="col-span-3">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
