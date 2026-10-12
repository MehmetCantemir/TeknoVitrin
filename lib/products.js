// Ürün verisine erişen tüm fonksiyonlar burada toplanır.
// İleride chatbot da ürünleri aramak için bu dosyayı kullanacak.
import products from "@/data/products.json";

export const CATEGORIES = {
  laptop: "Laptop",
  desktop: "Masaüstü Bilgisayar",
  phone: "Telefon",
};

export const SEGMENTS = {
  office: "Ofis",
  gaming: "Gaming",
};

export const SORTS = {
  onerilen: "Önerilen",
  "fiyat-artan": "Fiyat: Düşükten yükseğe",
  "fiyat-azalan": "Fiyat: Yüksekten düşüğe",

  isim:"İsme göre (A-Z)",
};

export function getAllProducts() {
  return products;
}

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug);
}

export function filterProducts({ category, segment, sort = "onerilen" } = {}) {
  let result = products.filter(
    (p) =>
      (!category || p.category === category) &&
      (!segment || p.segment === segment)
  );

  if (sort === "fiyat-artan") {
    result = [...result].sort((a, b) => a.price - b.price);
  } else if (sort === "fiyat-azalan") {
    result = [...result].sort((a, b) => b.price - a.price);
  } else if (sort=="isim"){
    result = [...result].sort((a, b)=> a.name.localeCompare(b.name, "tr"));
  }
  else
  {
    // Önerilen: stokta olanlar önce gelir, sıra veri dosyasındaki gibi kalır.
    result = [...result].sort((a, b) => Number(b.inStock) - Number(a.inStock));
  }
  return result;
}

export function getSimilarProducts(product, limit = 3) {
  return products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.category === product.category &&
        p.segment === product.segment &&
        p.inStock
    )
    .sort(
      (a, b) =>
        Math.abs(a.price - product.price) - Math.abs(b.price - product.price)
    )
    .slice(0, limit);
}

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export function formatPrice(price) {
  return priceFormatter.format(price);
}

// --- Detay sayfasındaki teknik özellik tablosu için etiketler ---

const gb = (v) => (v >= 1024 ? `${v / 1024} TB` : `${v} GB`);

const SPEC_LABELS = {
  cpu: ["İşlemci"],
  chipset: ["İşlemci"],
  ramGb: ["RAM", gb],
  storageGb: ["Depolama", gb],
  storageType: ["Depolama tipi"],
  gpu: ["Ekran kartı"],
  os: ["İşletim sistemi"],
  formFactor: ["Kasa tipi"],
  powerSupplyW: ["Güç kaynağı", (v) => `${v} W`],
  screenInch: ["Ekran boyutu", (v) => `${v} inç`],
  coverScreenInch: ["Dış ekran", (v) => `${v} inç`],
  display: ["Ekran tipi"],
  resolution: ["Çözünürlük"],
  refreshRateHz: ["Yenileme hızı", (v) => `${v} Hz`],
  weightKg: ["Ağırlık", (v) => `${v} kg`],
  weightG: ["Ağırlık", (v) => `${v} g`],
  batteryHours: ["Pil ömrü", (v) => `${v} saate kadar`],
  batteryMah: ["Batarya", (v) => `${v} mAh`],
  chargingW: ["Şarj hızı", (v) => `${v} W`],
  wirelessCharging: ["Kablosuz şarj"],
  mainCameraMp: ["Ana kamera", (v) => `${v} MP`],
  cameraSetup: ["Kamera sistemi"],
  has5G: ["5G"],
  waterResistance: ["Su/toz dayanıklılığı"],
  gamingExtras: ["Oyun özellikleri"],
  extras: ["Ek özellikler"],
  // Ofis özellikleri
  fingerprintReader: ["Parmak izi okuyucu"],
  webcam: ["Kamera"],
  backlitKeyboard: ["Aydınlatmalı klavye"],
  penSupport: ["Kalem desteği"],
  ports: ["Bağlantı noktaları"],
  wifi: ["Kablosuz ağ"],
  bluetooth: ["Bluetooth"],
  vesaMount: ["VESA montaj"],
  noiseLevel: ["Ses seviyesi"],
  maxMonitors: ["Maks. monitör", (v) => `${v} adet`],
  includedPeripherals: ["Kutu içeriği"],
  upgradeable: ["Yükseltilebilir"],
  // Gaming özellikleri
  vramGb: ["Ekran kartı belleği", (v) => `${v} GB`],
  gpuMaxPowerW: ["Ekran kartı gücü (TGP)", (v) => `${v} W`],
  cooling: ["Soğutma"],
  keyboardLighting: ["Klavye aydınlatması"],
  muxSwitch: ["MUX switch"],
  rgbLighting: ["RGB aydınlatma"],
  glassSidePanel: ["Cam yan panel"],
  targetResolution: ["Hedef oyun çözünürlüğü"],
};

// { ramGb: 16 } gibi bir nesneyi [{ label: "RAM", value: "16 GB" }] listesine çevirir.
export function toSpecRows(obj = {}) {
  return Object.entries(obj).map(([key, value]) => {
    const [label = key, format] = SPEC_LABELS[key] ?? [];
    let display;
    if (typeof value === "boolean") display = value ? "Var" : "Yok";
    else if (Array.isArray(value)) display = value.join(", ");
    else display = format ? format(value) : String(value);
    return { key, label, value: display };
  });
}

// =====================================================================
// Chatbot için ürün arama fonksiyonları
// Claude bu fonksiyonları doğrudan çağıramaz; app/api/chat/route.js
// Claude'un "araç" (tool) isteklerini alıp bu fonksiyonları çalıştırır.
// =====================================================================

export function getProductById(id) {
  return products.find((p) => p.id === id);
}

// Türkçe büyük/küçük harf farkını ortadan kaldırır ("İ" → "i", "I" → "ı").
const normalize = (text) => String(text).toLocaleLowerCase("tr");

// Bir ürünün aranabilir tüm metnini tek bir string'de toplar.
function searchableText(product) {
  return normalize(
    [
      product.name,
      product.brand,
      CATEGORIES[product.category],
      SEGMENTS[product.segment] ?? "",
      product.tags.join(" "),
      product.shortDescription,
      product.description,
      Object.values(product.specs).join(" "),
      Object.values(product.officeFeatures ?? product.gamingFeatures ?? {}).join(" "),
    ].join(" ")
  );
}

export function searchProducts({
  query = "",
  category,
  segment,
  minPrice,
  maxPrice,
  includeOutOfStock = false,
  limit = 6,
} = {}) {
  // 1) Kesin filtreler: kategori, segment, fiyat aralığı, stok
  let result = products.filter(
    (p) =>
      (!category || p.category === category) &&
      (!segment || p.segment === segment) &&
      (minPrice == null || p.price >= minPrice) &&
      (maxPrice == null || p.price <= maxPrice) &&
      (includeOutOfStock || p.inStock)
  );

  // 2) Serbest metin: her kelimenin üründe geçip geçmediğine bakıp puan verir
  const words = normalize(query).split(/\s+/).filter((w) => w.length > 1);
  if (words.length > 0) {
    result = result
      .map((p) => {
        const text = searchableText(p);
        const tagText = normalize(p.tags.join(" "));
        const score = words.reduce(
          (sum, w) => sum + (tagText.includes(w) ? 2 : text.includes(w) ? 1 : 0),
          0
        );
        return { p, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.p.price - b.p.price)
      .map(({ p }) => p);
  } else {
    result = [...result].sort((a, b) => a.price - b.price);
  }

  return result.slice(0, Math.min(limit, 12));
}

// Claude'a gönderilen kısa ürün özeti (her şeyi göndermek gereksiz token harcar).
export function toCompactProduct(p) {
  const s = p.specs;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    segment: p.segment,
    price: p.price,
    inStock: p.inStock,
    tags: p.tags,
    summary: p.shortDescription,
    keySpecs: {
      cpu: s.cpu ?? s.chipset,
      ramGb: s.ramGb,
      storageGb: s.storageGb,
      gpu: s.gpu,
      screenInch: s.screenInch,
      refreshRateHz: s.refreshRateHz,
      batteryMah: s.batteryMah,
      mainCameraMp: s.mainCameraMp,
      weightKg: s.weightKg,
    },
  };
}

// Sohbet penceresindeki küçük ürün kartı için gereken bilgiler.
export function toCardProduct(p) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    segment: p.segment,
    inStock: p.inStock,
    priceText: formatPrice(p.price),
  };
}
