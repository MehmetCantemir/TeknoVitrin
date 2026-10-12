# TeknoVitrin

Laptop, masaüstü bilgisayar ve telefonları listeleyen bir ürün vitrini ve bu ürünlerden öneri yapan,
yazılı ve sesli mesaj alabilen bir yapay zeka asistanı (öğrenme projesi; satış yok).

## Çalıştırma

```bash
npm install     # ilk seferde paketleri kurar
npm run dev     # http://localhost:3000 adresinde açar
```

`.env.local` dosyası gereklidir (Git'e eklenmez):

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-5-5
```

`.env.local` değiştiğinde sunucuyu yeniden başlat (Ctrl+C, sonra `npm run dev`).

## Özellikler

- Ürün listesi: kategori (Laptop / Masaüstü / Telefon), kullanım (Ofis / Gaming) filtresi ve sıralama
  (önerilen, fiyat, isim)
- Ürün detay sayfası: teknik özellikler, ofis/oyun özellikleri, benzer ürünler
- Sohbet asistanı: Claude, sitedeki ürünleri araçlarla (tool use) arar ve öneriler kart olarak gösterilir
- Sesli giriş: mikrofon butonu, Türkçe konuşma tanıma (Chrome ve Edge)

## Klasör yapısı

| Yol | Ne işe yarar |
|---|---|
| `data/products.json` | 36 örnek ürün |
| `lib/products.js` | Ürün okuma, filtreleme, sıralama, chatbot araması (`searchProducts`) |
| `lib/useSpeechRecognition.js` | Sesli giriş için React hook'u (Web Speech API) |
| `app/layout.js` | Ortak iskelet: başlık, menü, sohbet penceresi |
| `app/page.js` | Ana sayfa: ürün listesi ve filtreler |
| `app/urun/[slug]/page.js` | Ürün detay sayfası |
| `app/api/chat/route.js` | Chatbot API'si: sistem talimatı, araçlar, Claude ile araç döngüsü |
| `components/ChatWidget.js` | Sohbet penceresi (yazı + mikrofon + ürün kartları) |
| `components/ProductCard.js`, `ProductImage.js` | Ürün kartı ve kategoriye göre çizilen görsel |

## Durum

1. ✅ Ürün verisi
2. ✅ Vitrin
3. ✅ Chatbot backend'i
4. ✅ Sohbet arayüzü
5. ✅ Sesli giriş

