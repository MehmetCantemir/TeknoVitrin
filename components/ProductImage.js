// Gerçek ürün fotoğrafları olmadığı için kategoriye göre çizilen bir görsel.
// Fotoğraf eklemek istersen public/images/products içine koyup burada <img> kullanabilirsin.

const ICONS = {
  laptop: (
    <>
      <rect x="14" y="14" width="36" height="24" rx="2" />
      <path d="M8 44h48l-3 4H11z" />
    </>
  ),
  desktop: (
    <>
      <rect x="8" y="10" width="48" height="32" rx="2" />
      <path d="M28 42v7M36 42v7M22 50h20" />
    </>
  ),
  phone: (
    <>
      <rect x="21" y="6" width="22" height="52" rx="4" />
      <path d="M29 52h6" />
    </>
  ),
};

function gradientFor(product) {
  if (product.category === "phone") return "from-emerald-500 to-teal-700";
  if (product.segment === "gaming") return "from-violet-600 to-fuchsia-600";
  return "from-sky-500 to-blue-700";
}

const SIZES = {
  sm: { box: "h-12 w-12 shrink-0 rounded-lg", icon: "w-7 h-7", label: false },
  md: { box: "aspect-[4/3]", icon: "w-20 h-20", label: true },
  lg: { box: "aspect-[4/3] rounded-2xl", icon: "w-32 h-32", label: true },
};

export default function ProductImage({ product, size = "md" }) {
  const { box, icon, label } = SIZES[size];
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${gradientFor(
        product
      )} ${box}`}
    >
      <svg
        viewBox="0 0 64 64"
        className={`${icon} text-white/90`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[product.category]}
      </svg>
      {label && (
        <span className="absolute bottom-3 left-4 text-sm font-semibold tracking-wide text-white/80">
          {product.brand}
        </span>
      )}
    </div>
  );
}
