// Ürün görseli: gece vitrini bölmesi.
// Lacivert bir bölme, üstten vuran soğuk bir spot ışığı ve ürün ikonu.
// Işığın rengi ürün türünü söyler: ofis = buzul mavisi, gaming = lavanta, telefon = buz yeşili.

const ICONS = {
  laptop: (
    <>
      <rect x="14" y="16" width="36" height="23" rx="2" />
      <path d="M8 44h48l-3 4H11z" />
    </>
  ),
  desktop: (
    <>
      <rect x="9" y="11" width="46" height="30" rx="2" />
      <path d="M28 41v7M36 41v7M22 49h20" />
    </>
  ),
  phone: (
    <>
      <rect x="22" y="7" width="20" height="46" rx="4" />
      <path d="M29 48h6" />
    </>
  ),
};

export function lightFor(product) {
  if (product.category === "phone") return "var(--color-ice)";
  if (product.segment === "gaming") return "var(--color-lavender)";
  return "var(--color-glacier)";
}

const SIZES = {
  sm: { box: "h-12 w-12 shrink-0 rounded-lg", icon: "w-7 h-7", label: false },
  md: { box: "aspect-[4/3]", icon: "w-20 h-20", label: true },
  lg: { box: "aspect-[4/3] rounded-2xl", icon: "w-36 h-36", label: true },
};

export default function ProductImage({ product, size = "md" }) {
  const { box, icon, label } = SIZES[size];
  const light = lightFor(product);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-ink ${box}`}>
      {/* Üstten vuran spot ışığı */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-55"
        style={{
          background: `radial-gradient(ellipse 55% 75% at 50% -5%, ${light}, transparent 72%)`,
        }}
      />
      {/* Ürünün durduğu zemindeki ışık halkası */}
      {size !== "sm" && (
        <div
          aria-hidden="true"
          className="absolute inset-x-[24%] bottom-[16%] h-[9%] rounded-[50%] opacity-30 blur-md"
          style={{ background: light }}
        />
      )}
      <svg
        viewBox="0 0 64 64"
        className={`relative ${icon}`}
        style={{ color: light }}
        fill="none"
        stroke="currentColor"
        strokeWidth={size === "sm" ? 2.4 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[product.category]}
      </svg>
      {label && (
        <span className="absolute left-4 top-3 font-display text-xs tracking-wide text-white/45">
          {product.brand}
        </span>
      )}
    </div>
  );
}
