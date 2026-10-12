import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import { CATEGORIES, SEGMENTS, formatPrice } from "@/lib/products";

export default function ProductCard({ product }) {
  return (
    <Link
      href={`/urun/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <ProductImage product={product} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
            {CATEGORIES[product.category]}
          </span>
          {product.segment && (
            <span
              className={`rounded-full px-2 py-0.5 ${
                product.segment === "gaming"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {SEGMENTS[product.segment]}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-500">
          {product.shortDescription}
        </p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-lg font-bold text-slate-900">
            {formatPrice(product.price)}
          </span>
          {!product.inStock && (
            <span className="text-xs font-medium text-red-600">Stokta yok</span>
          )}
        </div>
      </div>
    </Link>
  );
}
