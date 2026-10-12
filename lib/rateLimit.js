// Basit kullanım sınırı (rate limit): her ziyaretçinin mesaj zamanlarını hafızada tutar.
//
// Nasıl çalışır? "Kayan pencere" yöntemi:
// Her mesajda, o ziyaretçinin son X saniyedeki mesajları sayılır.
// Sayı sınıra ulaştıysa istek reddedilir ve ne kadar beklemesi gerektiği söylenir.
//
// Önemli sınırlama: Hafıza sunucu örneğine (instance) özeldir. Vercel trafiğe göre
// birden fazla örnek çalıştırabilir veya bir süre kullanılmayan örneği kapatabilir;
// bu durumda sayaçlar ayrı tutulur ya da sıfırlanır. Öğrenme projesi için yeterlidir;
// kesin sınır gerekirse sayaçlar Redis gibi ortak bir depoya taşınır (ör. Upstash).

export const RULES = [
  { limit: 8, windowMs: 60 * 1000, label: "dakikada" },
  { limit: 50, windowMs: 24 * 60 * 60 * 1000, label: "günde" },
];

const MAX_WINDOW = Math.max(...RULES.map((r) => r.windowMs));
const MAX_KEYS = 5000; // hafızanın sınırsız büyümesini engeller

const hits = new Map(); // ziyaretçi anahtarı -> mesaj zamanları (ms) listesi

export function checkRateLimit(key, now = Date.now()) {
  // Bu ziyaretçinin en uzun pencereden eski kayıtlarını at
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < MAX_WINDOW);

  for (const rule of RULES) {
    const inWindow = timestamps.filter((t) => now - t < rule.windowMs);
    if (inWindow.length >= rule.limit) {
      // En eski mesaj pencereden çıktığında tekrar yazabilir
      const retryAfterSec = Math.ceil((inWindow[0] + rule.windowMs - now) / 1000);
      hits.set(key, timestamps);
      return { ok: false, retryAfterSec, rule };
    }
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  cleanup(now);
  return { ok: true };
}

function cleanup(now) {
  if (hits.size <= MAX_KEYS) return;
  for (const [key, timestamps] of hits) {
    if (timestamps.every((t) => now - t >= MAX_WINDOW)) hits.delete(key);
  }
  // Hâlâ çok büyükse en eski eklenenleri sil (Map ekleme sırasını korur)
  for (const key of hits.keys()) {
    if (hits.size <= MAX_KEYS) break;
    hits.delete(key);
  }
}

// Bekleme süresini okunur hale getirir: 45 → "45 saniye", 3700 → "1 saat 2 dakika"
export function formatWait(seconds) {
  if (seconds < 60) return `${seconds} saniye`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} dakika`;
  return minutes ? `${hours} saat ${minutes} dakika` : `${hours} saat`;
}

// Ziyaretçinin IP adresini bulur. Vercel gerçek adresi x-forwarded-for başlığına yazar.
export function getClientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "yerel";
}
