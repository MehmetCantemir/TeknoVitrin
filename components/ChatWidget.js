"use client";
// "use client": Bu bileşen tarayıcıda çalışır. Çünkü kullanıcı etkileşimi
// (tıklama, yazma) ve değişen durum (useState) gerektiriyor.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import useSpeechRecognition from "@/lib/useSpeechRecognition";

const WELCOME = {
  role: "assistant",
  content:
    "Merhaba! Ben TeknoVitrin asistanıyım. Ne için bir cihaz aradığını ve bütçeni yazarsan sana uygun ürünleri bulayım.",
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

  // Konuşma bitince tanınan metin otomatik olarak gönderilir.
  const speech = useSpeechRecognition({ onResult: (text) => send(text) });

  // Yeni mesaj geldiğinde en alta kaydır
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

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
        <div className="fixed bottom-24 right-4 z-50 flex h-[min(36rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">TeknoVitrin Asistanı</p>
              <p className="text-xs text-slate-300">Sana uygun ürünü birlikte bulalım</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-2 text-xl text-slate-300 hover:text-white"
              aria-label="Sohbeti kapat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, i) => (
              <Message key={i} message={message} />
            ))}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="w-fit rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-slate-400 shadow-sm">
                Ürünlere bakıyorum…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {speech.error && (
            <p className="border-t border-slate-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {speech.error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault(); // Sayfanın yenilenmesini engelle
              send(input);
            }}
            className="flex gap-2 border-t border-slate-200 p-3"
          >
            <input
              value={speech.listening ? speech.transcript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={speech.listening ? "Dinliyorum…" : "Mesajını yaz veya konuş…"}
              className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500"
              disabled={loading || speech.listening}
            />
            {speech.supported && (
              <button
                type="button"
                onClick={speech.listening ? speech.stop : speech.start}
                disabled={loading}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                  speech.listening
                    ? "animate-pulse bg-red-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Gönder
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:scale-105 hover:bg-blue-700"
        aria-label={open ? "Sohbeti kapat" : "Asistanla konuş"}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : message.error
            ? "rounded-bl-sm bg-red-50 text-red-700"
            : "rounded-bl-sm bg-white text-slate-800"
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
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 hover:border-blue-400"
            >
              <ProductImage product={product} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                <p className="text-sm font-bold text-blue-700">{product.priceText}</p>
              </div>
              <span className="pr-1 text-slate-400">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
