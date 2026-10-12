"use client";
// "use client": Bu bileşen tarayıcıda çalışır. Çünkü kullanıcı etkileşimi
// (tıklama, yazma, mikrofon) ve değişen durum (useState) gerektiriyor.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import useSpeechRecognition from "@/lib/useSpeechRecognition";

const WELCOME = {
  role: "assistant",
  content:
    "Merhaba, ben TeknoVitrin asistanıyım. Cihazı ne için kullanacağını ve yaklaşık bütçeni yaz ya da söyle, sana vitrindeki uygun ürünleri göstereyim.",
  products: [],
};

const SUGGESTIONS = [
  "40 bin TL altı oyun laptopu",
  "Annem için kullanımı kolay bir telefon",
  "Ofis için sessiz bir masaüstü",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const sendRef = useRef(null);

  // Konuşma bitince tanınan metin otomatik olarak gönderilir.
  const speech = useSpeechRecognition({ onResult: (text) => send(text) });

  // Yeni mesaj geldiğinde en alta kaydır
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  // Sayfadaki diğer bileşenler ("Asistana sor" kutusu gibi) "tv:ask" olayıyla soru gönderebilir.
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    function onAsk(event) {
      setOpen(true);
      sendRef.current?.(event.detail);
    }
    window.addEventListener("tv:ask", onAsk);
    return () => window.removeEventListener("tv:ask", onAsk);
  }, []);

  async function send(text) {
    const content = text.trim();
    if (!content || loading) return;

    const updated = [...messages, { role: "user", content }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Hoş geldin ve hata mesajlarını göndermiyoruz, sadece gerçek konuşmayı
          messages: updated
            .filter((m) => m !== WELCOME && !m.error)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bir hata oluştu.");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, products: data.products },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error.message, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="TeknoVitrin asistanı"
          className="fixed bottom-24 right-4 z-50 flex h-[min(38rem,calc(100dvh-8rem))] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-mist bg-frost shadow-[0_24px_60px_-20px_rgba(15,30,51,0.45)]"
        >
          <div className="relative flex items-center justify-between overflow-hidden bg-ink px-5 py-4 text-white">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse 50% 120% at 15% -20%, var(--color-glacier), transparent 70%)",
              }}
            />
            <div className="relative">
              <p className="font-display font-semibold">Vitrin asistanı</p>
              <p className="text-xs text-white/55">Yaz ya da mikrofona konuş</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Sohbeti kapat"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message, i) => (
              <Message key={i} message={message} />
            ))}

            {messages.length === 1 && (
              <div className="flex flex-col items-start gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-mist bg-white px-3 py-1.5 text-left text-sm text-fjord transition-colors hover:border-glacier"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex w-fit items-center gap-1.5 rounded-xl rounded-bl-sm bg-white px-4 py-3" aria-label="Asistan yazıyor">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-glacier motion-safe:animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {speech.error && (
            <p className="border-t border-mist bg-white px-4 py-2 text-xs text-red-700">{speech.error}</p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault(); // Sayfanın yenilenmesini engelle
              send(input);
            }}
            className="flex items-center gap-2 border-t border-mist bg-white p-3"
          >
            <label htmlFor="chat-input" className="sr-only">Mesajın</label>
            <input
              id="chat-input"
              value={speech.listening ? speech.transcript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={speech.listening ? "Dinliyorum…" : "Mesajını yaz…"}
              className="min-w-0 flex-1 rounded-lg bg-frost px-3.5 py-2.5 text-sm outline-none ring-1 ring-transparent placeholder:text-steel/70 focus:ring-glacier"
              disabled={loading || speech.listening}
            />
            {speech.supported && (
              <button
                type="button"
                onClick={speech.listening ? speech.stop : speech.start}
                disabled={loading}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                  speech.listening
                    ? "bg-fjord text-white motion-safe:animate-pulse"
                    : "bg-frost text-steel hover:text-ink"
                }`}
                aria-label={speech.listening ? "Dinlemeyi durdur" : "Sesli mesaj gönder"}
                title={speech.listening ? "Dinlemeyi durdur" : "Sesli mesaj gönder"}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={loading || speech.listening || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-white transition-colors hover:bg-navy disabled:opacity-30"
              aria-label="Gönder"
              title="Gönder"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-glacier shadow-[0_12px_30px_-10px_rgba(15,30,51,0.6)] ring-1 ring-glacier/30 transition-colors hover:bg-navy"
        aria-label={open ? "Sohbeti kapat" : "Asistanla konuş"}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
      </button>
    </>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-ink text-white"
            : message.error
            ? "rounded-bl-sm border border-red-200 bg-white text-red-700"
            : "rounded-bl-sm bg-white text-ink"
        }`}
      >
        {message.content}
      </div>

      {message.products?.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          {message.products.map((product) => (
            <Link
              key={product.id}
              href={`/urun/${product.slug}`}
              className="flex items-center gap-3 rounded-xl border border-mist bg-white p-2 pr-3 transition-colors hover:border-glacier"
            >
              <ProductImage product={product} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-ink">{product.name}</p>
                <p className="text-sm text-fjord">{product.priceText}</p>
              </div>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-steel" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
