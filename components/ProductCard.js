import Link from "next/link";
import ProductImage, { lightFor } from "@/components/ProductImage";
import { CATEGORIES, SEGMENTS, formatPrice, keySpecs } from "@/lib/products";

export default function ProductCard({ product }) {
  return (
    <Link
      href={`/urun/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-mist bg-white transition-colors hover:border-glacier"
    >
      <ProductImage product={product} />

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-xs text-steel">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: lightFor(product) }}
          />
          {product.segment ? `${SEGMENTS[product.segment]} ${CATEGORIES[product.category].toLocaleLowerCase("tr")}` : CATEGORIES[product.category]}
        </p>

        <h3 className="mt-1.5 font-display font-semibold leading-snug text-ink group-hover:text-fjord">
          {product.name}
        </h3>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {keySpecs(product).map((spec) => (
            <li key={spec} className="rounded-md bg-frost px-2 py-0.5 text-xs text-steel">
              {spec}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-baseline justify-between pt-4">
          <span
            className={`font-display text-lg font-semibold ${
              product.inStock ? "text-ink" : "text-steel/70"
            }`}
          >
            {formatPrice(product.price)}
          </span>
          {!product.inStock && <span className="text-xs text-steel">Stokta yok</span>}
        </div>
      </div>
    </Link>
  );
}
