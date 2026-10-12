// POST /api/chat
// Tarayıcıdan gelen sohbet geçmişini alır, Claude'a gönderir,
// Claude ürün aramak isterse araçları çalıştırır ve son cevabı döndürür.
// Bu dosya SADECE sunucuda çalışır; API anahtarı tarayıcıya hiç gitmez.

import { NextResponse } from "next/server";
import {
  getProductById,
  searchProducts,
  toCardProduct,
  toCompactProduct,
} from "@/lib/products";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_TOOL_ROUNDS = 5; // Sonsuz döngüye karşı güvenlik sınırı
const MAX_HISTORY = 20; // Claude'a gönderilen en fazla mesaj sayısı

const SYSTEM_PROMPT = `Sen TeknoVitrin adlı teknoloji mağazasının satış asistanısın. Mağazada yalnızca laptop, masaüstü bilgisayar ve telefon var. Bilgisayarlar "office" (ofis/günlük kullanım) ve "gaming" (oyun) olarak ikiye ayrılır.

Kurallar:
- Ürün önermeden önce MUTLAKA search_products aracıyla ara. Yalnızca araçlardan gelen ürünleri öner; ürün, fiyat veya özellik uydurma.
- Kullanıcının bütçesini (ör. "30 bin altı" = maxPrice 30000), kullanım amacını ve kategorisini arama parametrelerine dönüştür.
- Önerdiğin ürünleri show_products aracıyla kart olarak göster (en fazla 3 ürün). Önerinin açıklamasını mutlaka yaz; kartlar tek başına cevap değildir.
- İstek çok belirsizse (ör. sadece "bilgisayar istiyorum") önce kısa bir soru sor: bütçe ve kullanım amacı.
- Uygun ürün yoksa bunu dürüstçe söyle ve en yakın alternatifi öner.
- Stokta olmayan ürünleri yalnızca kullanıcı özellikle sorarsa an ve stokta olmadığını belirt.
- Mağaza dışındaki konulara kibarca kısa cevap ver ve sohbeti ürünlere yönlendir.
- Türkçe, samimi ve kısa yaz (en fazla 4-5 cümle). Markdown, başlık veya madde işareti kullanma; düz metin yaz. Fiyatları "32.999 TL" biçiminde yaz.`;

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
function runTool(name, input, shownIds) {
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
    default:
      return JSON.stringify({ error: `Bilinmeyen araç: ${name}` });
  }
}

// Anahtarın başında/sonunda yanlışlıkla kopyalanan boşluk veya tırnakları temizler.
function getApiKey() {
  return (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");
}

async function callClaude(messages) {
  const response = await fetch(API_URL, {
    method: "POST",
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
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude API hatası (${response.status}): ${detail}`);
  }
  return response.json();
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

  const shownIds = [];
  const replyParts = []; // Claude her adımda metin yazabilir; hepsini topluyoruz

  // Toplanan metinden son cevabı oluşturur.
  const finish = (fallback) =>
    NextResponse.json({
      reply:
        replyParts.join("\n\n").trim() ||
        (shownIds.length > 0 ? "Sana uygun bulduğum ürünler şunlar:" : fallback),
      products: shownIds.map(getProductById).map(toCardProduct),
    });

  try {
    // Ajan döngüsü: Claude araç istedikçe çalıştır, sonucu geri gönder.
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await callClaude(messages);

      for (const block of response.content) {
        if (block.type === "text" && block.text.trim()) replyParts.push(block.text.trim());
      }

      if (response.stop_reason !== "tool_use") {
        return finish("Bir sorun oldu, mesajını tekrar yazar mısın?");
      }

      // Claude'un araç isteğini geçmişe ekle, araçları çalıştır, sonuçları gönder.
      messages.push({ role: "assistant", content: response.content });
      const toolResults = response.content
        .filter((block) => block.type === "tool_use")
        .map((block) => ({
          type: "tool_result",
          tool_use_id: block.id,
          content: runTool(block.name, block.input, shownIds),
        }));
      messages.push({ role: "user", content: toolResults });
    }

    return finish("İsteğini tamamlayamadım, biraz daha basit sorabilir misin?");
  } catch (error) {
    console.error(error); // Detay VS Code terminalinde görünür
    return NextResponse.json(
      { error: "Asistana şu an ulaşılamıyor. Terminaldeki hata mesajına bak." },
      { status: 502 }
    );
  }
}
