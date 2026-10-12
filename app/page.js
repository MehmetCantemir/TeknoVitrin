import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, SEGMENTS, SORTS, filterProducts } from "@/lib/products";

// Filtreler URL'de tutulur: /?kategori=laptop&segment=gaming&sirala=fiyat-artan
// Böylece filtrelenmiş bir sayfanın linki paylaşılabilir ve sayfa sunucuda hazırlanır.
export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const category = CATEGORIES[params.kategori] ? params.kategori : undefined;
  const segment =
    SEGMENTS[params.segment] && category !== "phone" ? params.segment : undefined;
  const sort = SORTS[params.sirala] ? params.sirala : "onerilen";

  const products = filterProducts({ category, segment, sort });

  // Mevcut filtreleri koruyarak yeni bir link üretir.
  function href(changes) {
    const next = {
      kategori: category,
      segment,
      sirala: sort === "onerilen" ? undefined : sort,
      ...changes,
    };
    if (next.kategori === "phone") next.segment = undefined;
    const qs = new URLSearchParams(
      Object.entries(next).filter(([, value]) => value)
    ).toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">
          {category ? CATEGORIES[category] : "Tüm Ürünler"}
          {segment && ` · ${SEGMENTS[segment]}`}
        </h1>
        <p className="mt-1 text-slate-500">{products.length} ürün listeleniyor</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <FilterRow label="Kategori">
          <Chip href={href({ kategori: undefined })} active={!category}>Tümü</Chip>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <Chip key={key} href={href({ kategori: key })} active={category === key}>
              {label}
            </Chip>
          ))}
        </FilterRow>

        {category !== "phone" && (
          <FilterRow label="Kullanım">
            <Chip href={href({ segment: undefined })} active={!segment}>Tümü</Chip>
            {Object.entries(SEGMENTS).map(([key, label]) => (
              <Chip key={key} href={href({ segment: key })} active={segment === key}>
                {label}
              </Chip>
            ))}
          </FilterRow>
        )}

        <FilterRow label="Sırala">
          {Object.entries(SORTS).map(([key, label]) => (
            <Chip
              key={key}
              href={href({ sirala: key === "onerilen" ? undefined : key })}
              active={sort === key}
            >
              {label}
            </Chip>
          ))}
        </FilterRow>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </div>
  );
}

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-sm font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function Chip({ href, active, children }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 text-slate-700 hover:border-slate-400"
      }`}
    >
      {children}
    </Link>
  );
}
