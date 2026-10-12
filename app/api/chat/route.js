// POST /api/chat
// Tarayıcıdan gelen sohbet geçmişini alır, Claude'a gönderir,
// Claude ürün aramak isterse araçları çalıştırır ve cevabı AKIŞ (streaming) olarak döndürür.
// Bu dosya SADECE sunucuda çalışır; API anahtarı tarayıcıya hiç gitmez.
//
// Tarayıcıya giden akışın biçimi: her satır bir JSON olay (NDJSON):
//   {"type":"text","text":"..."}        → cevaba eklenecek metin parçası
//   {"type":"status","text":"..."}      → "Ürünlere bakıyorum…" gibi durum bilgisi
//   {"type":"products","products":[…]}  → gösterilecek ürün kartları
//   {"type":"comparison","comparison":{…}} → karşılaştırma tablosu
//   {"type":"error","error":"..."}      → akış sırasında oluşan hata
//   {"type":"done"}                     → cevap tamamlandı

import { NextResponse } from "next/server";
import {
  buildComparison,
  getProductById,
  searchProducts,
  toCardProduct,
  toCompactProduct,
} from "@/lib/products";
import { checkRateLimit, formatWait, getClientKey } from "@/lib/rateLimit";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_TOOL_ROUNDS = 5; // Sonsuz döngüye karşı güvenlik sınırı
const MAX_HISTORY = 20; // Claude'a gönderilen en fazla mesaj sayısı

// Vercel'de bu fonksiyonun en fazla kaç saniye çalışabileceği
export const maxDuration = 60;

// Claude bir aracı kullanmaya başladığında ziyaretçiye gösterilecek durum metinleri
const TOOL_STATUS = {
  search_products: "Ürünlere bakıyorum…",
  get_product_details: "Teknik özellikleri inceliyorum…",
  show_products: "Ürün kartlarını hazırlıyorum…",
  compare_products: "Karşılaştırma tablosunu hazırlıyorum…",
};

const SYSTEM_PROMPT = `Sen TeknoVitrin adlı teknoloji mağazasının satış asistanısın. Mağazada yalnızca laptop, masaüstü bilgisayar ve telefon var. Bilgisayarlar "office" (ofis/günlük kullanım) ve "gaming" (oyun) olarak ikiye ayrılır.

Kurallar:
- Ürün önermeden önce MUTLAKA search_products aracıyla ara. Yalnızca araçlardan gelen ürünleri öner; ürün, fiyat veya özellik uydurma.
- Kullanıcının bütçesini (ör. "30 bin altı" = maxPrice 30000), kullanım amacını ve kategorisini arama parametrelerine dönüştür.
- Önerdiğin ürünleri show_products aracıyla kart olarak göster (en fazla 3 ürün). Önerinin açıklamasını mutlaka yaz; kartlar tek başına cevap değildir.
- Kullanıcı 2-3 ürünü karşılaştırmak isterse veya iki seçenek arasında kararsızsa compare_products aracını kullan (ürün kimliklerini bilmiyorsan önce search_products ile bul). Tablo ekranda kendiliğinden görünür; değerleri metinde tekrar sayma, sadece en önemli 2-3 farkı ve kime hangisinin uygun olduğunu kısaca yaz. Karşılaştırma yaptığında show_products kullanma.
- İstek çok belirsizse (ör. sadece "bilgisayar istiyorum") önce kısa bir soru sor: bütçe ve kullanım amacı.
- Uygun ürün yoksa bunu dürüstçe söyle ve en yakın alternatifi öner.
- Stokta olmayan ürünleri yalnızca kullanıcı özellikle sorarsa an ve stokta olmadığını belirt.
- Mağaza dışındaki konulara kibarca kısa cevap ver ve sohbeti ürünlere yönlendir.
- Türkçe, samimi ve kısa yaz (en fazla 4-5 cümle). Kullanıcıya "sen" diye hitap et. Başlık, liste veya madde işareti kullanma; ürün adlarını **kalın** yazabilirsin. Fiyatları "32.999 TL" biçiminde yaz.
- Kartlar cevabının altında kendiliğinden görünür; "kartları görebilirsin" gibi cümleler yazma.`;

const TOOLS = [
  {
    name: "search_products",
    description:
      "Mağazadaki ürünleri arar. Kategori, segment ve fiyat kesin filtredir; query ise ürün adı, marka, etiket, açıklama ve teknik özelliklerde aranan anahtar kelimelerdir (ör. 'oyun öğrenci', 'uzun pil', 'RTX 4060', 'kamera'). Varsayılan olarak yalnızca stoktaki ürünleri döndürür.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Anahtar kelimeler (boş bırakılabilir)" },
        category: { type: "string", enum: ["laptop", "desktop", "phone"] },
        segment: {
          type: "string",
          enum: ["office", "gaming"],
          description: "Sadece bilgisayarlar için",
        },
        minPrice: { type: "number", description: "TL cinsinden en düşük fiyat" },
        maxPrice: { type: "number", description: "TL cinsinden en yüksek fiyat" },
        includeOutOfStock: { type: "boolean" },
        limit: { type: "integer", description: "En fazla kaç ürün (varsayılan 6)" },
      },
    },
  },
  {
    name: "get_product_details",
    description: "Bir ürünün tüm teknik özelliklerini getirir. Detaylı karşılaştırma veya soru için kullan.",
    input_schema: {
      type: "object",
      properties: { product_id: { type: "string", description: "Örn. lt-007" } },
      required: ["product_id"],
    },
  },
  {
    name: "compare_products",
    description:
      "2 veya 3 ürünü yan yana karşılaştırma tablosu olarak kullanıcıya gösterir. Tablo ürün verisinden otomatik oluşturulur ve en iyi değerler vurgulanır. Sonuç olarak ürünlerin özetini döndürür.",
    input_schema: {
      type: "object",
      properties: {
        product_ids: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
      },
      required: ["product_ids"],
    },
  },
  {
    name: "show_products",
    description: "Önerdiğin ürünleri sohbet penceresinde tıklanabilir kart olarak gösterir.",
    input_schema: {
      type: "object",
      properties: {
        product_ids: { type: "array", items: { type: "string" }, maxItems: 3 },
      },
      required: ["product_ids"],
    },
  },
];

// Claude'un istediği aracı çalıştırır ve sonucunu metin olarak döndürür.
// ctx: bu cevap boyunca ekranda gösterilecekleri tutar ({ shownIds, comparison }).
function runTool(name, input, ctx) {
  const { shownIds } = ctx;
  switch (name) {
    case "search_products": {
      const results = searchProducts(input);
      return JSON.stringify({ count: results.length, products: results.map(toCompactProduct) });
    }
    case "get_product_details": {
      const product = getProductById(input.product_id);
      return JSON.stringify(product ?? { error: "Ürün bulunamadı" });
    }
    case "show_products": {
      for (const id of input.product_ids ?? []) {
        if (getProductById(id) && !shownIds.includes(id) && shownIds.length < 3) {
          shownIds.push(id);
        }
      }
      return "Ürün kartları kullanıcıya gösterildi.";
    }
    case "compare_products": {
      const comparison = buildComparison(input.product_ids ?? []);
      if (!comparison) {
        return JSON.stringify({ error: "Karşılaştırma için en az 2 geçerli ürün kimliği gerekli." });
      }
      ctx.comparison = comparison;
      const compared = comparison.products.map((p) => toCompactProduct(getProductById(p.id)));
      return JSON.stringify({ shownToUser: "Karşılaştırma tablosu gösterildi.", products: compared });
    }
    default:
      return JSON.stringify({ error: `Bilinmeyen araç: ${name}` });
  }
}

// Anahtarın başında/sonunda yanlışlıkla kopyalanan boşluk veya tırnakları temizler.
function getApiKey() {
  return (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");
}

// Claude'a akış (stream: true) isteği gönderir ve gelen olayları okur.
// Claude cevabı tek parça yerine "server-sent events" (SSE) olarak, küçük parçalar halinde yollar:
//   content_block_start  → yeni bir blok başladı (metin veya araç kullanımı)
//   content_block_delta  → bloğa yeni bir parça geldi (metin veya aracın JSON girdisi)
//   content_block_stop   → blok bitti
//   message_delta        → mesajın neden bittiği (stop_reason)
// Metin parçalarını geldikçe onText ile dışarı verir; sonunda tam mesajı döndürür.
async function streamClaude(messages, { onText, onToolStart, signal }) {
  const response = await fetch(API_URL, {
    method: "POST",
    signal, // ziyaretçi sayfadan ayrılırsa Claude isteği de iptal edilir
    headers: {
      "content-type": "application/json",
      "x-api-key": getApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude API hatası (${response.status}): ${detail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const blocks = [];
  let stopReason = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    // SSE olayları boş bir satırla ayrılır. Tamamlanmış olayları işle, yarım kalanı beklet.
    let separator;
    while ((separator = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);

      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(5).trim());

      switch (event.type) {
        case "content_block_start": {
          const block = event.content_block;
          if (block.type === "tool_use") {
            blocks[event.index] = { type: "tool_use", id: block.id, name: block.name, input: {}, json: "" };
            onToolStart?.(block.name);
          } else if (block.type === "text") {
            blocks[event.index] = { type: "text", text: "" };
          }
          break;
        }
        case "content_block_delta": {
          const block = blocks[event.index];
          if (!block) break;
          if (event.delta.type === "text_delta") {
            block.text += event.delta.text;
            onText?.(event.delta.text);
          } else if (event.delta.type === "input_json_delta") {
            block.json += event.delta.partial_json; // aracın girdisi parça parça gelir
          }
          break;
        }
        case "content_block_stop": {
          const block = blocks[event.index];
          if (block?.type === "tool_use") {
            block.input = block.json ? JSON.parse(block.json) : {};
            delete block.json;
          }
          break;
        }
        case "message_delta":
          stopReason = event.delta?.stop_reason ?? stopReason;
          break;
        case "error":
          throw new Error(`Claude akış hatası: ${event.error?.message ?? "bilinmiyor"}`);
      }
    }
  }

  // Boş metin blokları API'ye geri gönderilemez; onları ayıklıyoruz.
  const content = blocks.filter(
    (block) => block && !(block.type === "text" && !block.text.trim())
  );
  return { content, stopReason };
}

// Tarayıcıdan gelen veriye güvenmeyiz: biçimini kontrol edip temizleriz.
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const cleaned = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    if (!["user", "assistant"].includes(m?.role)) continue;
    if (typeof m.content !== "string" || !m.content.trim()) continue;
    const content = m.content.trim().slice(0, 2000);
    const last = cleaned.at(-1);
    // Aynı roldeki art arda mesajları birleştir (API sırayla user/assistant bekler)
    if (last && last.role === m.role) last.content += `\n${content}`;
    else cleaned.push({ role: m.role, content });
  }
  // Konuşma her zaman kullanıcı mesajıyla başlamalı
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  return cleaned;
}

export async function POST(request) {
  const apiKey = getApiKey();
  if (!apiKey.startsWith("sk-ant-")) {
    // Yerelde: .env.local dosyası. Vercel'de: Settings → Environment Variables (ardından Redeploy).
    console.error(
      apiKey ? "ANTHROPIC_API_KEY 'sk-ant-' ile başlamıyor." : "ANTHROPIC_API_KEY tanımlı değil."
    );
    return NextResponse.json(
      { error: "Asistan şu an yapılandırılmamış: sunucuda API anahtarı bulunamadı." },
      { status: 500 }
    );
  }

  // Kullanım sınırı: sınırı aşan istek Claude'a hiç gönderilmez, kredi harcanmaz.
  const limit = checkRateLimit(getClientKey(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Kısa sürede çok fazla mesaj gönderdin (${limit.rule.label} en fazla ${limit.rule.limit}). ${formatWait(limit.retryAfterSec)} sonra tekrar deneyebilirsin.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const messages = sanitizeHistory(body.messages);
  if (messages.length === 0 || messages.at(-1).role !== "user") {
    return NextResponse.json({ error: "Mesaj bulunamadı." }, { status: 400 });
  }

  // Akışı başlat: Claude'dan gelen her parçayı anında tarayıcıya ilet.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      const ctx = { shownIds: [], comparison: null };
      const { shownIds } = ctx;
      let wroteText = false; // şimdiye kadar metin yazıldı mı?
      let newRound = false; // araç turundan sonra yeni paragraf açmak için

      try {
        let finished = false;

        // Ajan döngüsü: Claude araç istedikçe çalıştır, sonucu geri gönder.
        for (let round = 0; round < MAX_TOOL_ROUNDS && !finished; round++) {
          const { content, stopReason } = await streamClaude(messages, {
            signal: request.signal,
            onText: (text) => {
              if (newRound && wroteText) emit({ type: "text", text: "\n\n" });
              newRound = false;
              wroteText = true;
              emit({ type: "text", text });
            },
            onToolStart: (name) => emit({ type: "status", text: TOOL_STATUS[name] ?? "Düşünüyorum…" }),
          });

          if (stopReason !== "tool_use") {
            finished = true;
            break;
          }

          // Claude'un araç isteğini geçmişe ekle, araçları çalıştır, sonuçları gönder.
          messages.push({ role: "assistant", content });
          const shownBefore = shownIds.length;
          const comparisonBefore = ctx.comparison;
          const toolResults = content
            .filter((block) => block.type === "tool_use")
            .map((block) => ({
              type: "tool_result",
              tool_use_id: block.id,
              content: runTool(block.name, block.input, ctx),
            }));
          messages.push({ role: "user", content: toolResults });

          if (ctx.comparison !== comparisonBefore) {
            emit({ type: "comparison", comparison: ctx.comparison });
          }
          if (shownIds.length > shownBefore) {
            emit({ type: "products", products: shownIds.map(getProductById).map(toCardProduct) });
          }
          newRound = true;
        }

        if (!wroteText) {
          emit({
            type: "text",
            text: ctx.comparison
              ? "Karşılaştırma tablosu aşağıda:"
              : shownIds.length > 0
              ? "Sana uygun bulduğum ürünler şunlar:"
              : "İsteğini tamamlayamadım, biraz daha basit sorabilir misin?",
          });
        }
        emit({ type: "done" });
      } catch (error) {
        if (request.signal.aborted) return; // ziyaretçi ayrıldı, yazacak kimse yok
        console.error(error); // Detay VS Code terminalinde / Vercel Logs'ta görünür
        emit({ type: "error", error: "Asistana şu an ulaşılamıyor, biraz sonra tekrar dener misin?" });
      } finally {
        try {
          controller.close();
        } catch {
          // akış zaten kapanmış olabilir
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // ara sunucuların akışı biriktirmesini engeller
    },
  });
}
