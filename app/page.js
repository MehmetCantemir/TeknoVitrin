import Link from "next/link";
import HeroAsk from "@/components/HeroAsk";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, SEGMENTS, SORTS, countBy, filterProducts, getAllProducts } from "@/lib/products";

// Filtreler URL'de tutulur: /?kategori=laptop&segment=gaming&sirala=fiyat-artan
// Böylece filtrelenmiş bir sayfanın linki paylaşılabilir ve sayfa sunucuda hazırlanır.
export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const category = CATEGORIES[params.kategori] ? params.kategori : undefined;
  const segment =
    SEGMENTS[params.segment] && category !== "phone" ? params.segment : undefined;
  const sort = SORTS[params.sirala] ? params.sirala : "onerilen";

  const products = filterProducts({ category, segment, sort });
  const categoryCounts = countBy("category");
  const isFiltered = Boolean(category || segment || sort !== "onerilen");

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
    return qs ? `/?${qs}#vitrin` : "/#vitrin";
  }

  const title = category
    ? `${segment ? SEGMENTS[segment] + " " : ""}${CATEGORIES[category]}`
    : segment
    ? `${SEGMENTS[segment]} bilgisayarlar`
    : "Tüm ürünler";

  return (
    <div className="space-y-10">
      {!isFiltered && (
        <section className="relative overflow-hidden rounded-2xl bg-ink px-6 py-12 sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-35"
            style={{
              background:
                "radial-gradient(ellipse 45% 90% at 85% -10%, var(--color-glacier), transparent 70%)",
            }}
          />
          <div className="relative">
            <p className="text-sm text-glacier">
              {getAllProducts().length} laptop, masaüstü bilgisayar ve telefon
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Ne için kullanacağını anlat, doğru cihazı birlikte bulalım.
            </h1>
            <HeroAsk />
          </div>
        </section>
      )}

      <section id="vitrin" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-steel">{products.length} ürün</p>
          </div>
          <SortLinks sort={sort} href={href} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Segmented label="Kategori">
            <Option href={href({ kategori: undefined })} active={!category}>
              Tümü
            </Option>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <Option key={key} href={href({ kategori: key })} active={category === key}>
                {key === "desktop" ? "Masaüstü" : label}
                <span className="ml-1.5 text-xs opacity-60">{categoryCounts[key]}</span>
              </Option>
            ))}
          </Segmented>

          {category !== "phone" && (
            <Segmented label="Kullanım">
              <Option href={href({ segment: undefined })} active={!segment}>
                Hepsi
              </Option>
              {Object.entries(SEGMENTS).map(([key, label]) => (
                <Option key={key} href={href({ segment: key })} active={segment === key}>
                  {label}
                </Option>
              ))}
            </Segmented>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Segmented({ label, children }) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-mist bg-white p-1">
      {children}
    </div>
  );
}

function Option({ href, active, children }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors sm:px-3.5 ${
        active ? "bg-ink text-white" : "text-steel hover:bg-frost hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function SortLinks({ sort, href }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-steel">Sırala:</span>
      {Object.entries(SORTS).map(([key, label]) => (
        <Link
          key={key}
          href={href({ sirala: key === "onerilen" ? undefined : key })}
          scroll={false}
          className={
            sort === key
              ? "font-medium text-fjord underline decoration-2 underline-offset-4"
              : "text-steel hover:text-ink"
          }
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
