"use client";
// Ana sayfadaki soru kutusu. Yazılan soruyu sohbet penceresine iletir.
// İki bileşen birbirini doğrudan tanımadığı için tarayıcının "olay" (event) sistemini kullanıyoruz:
// burada "tv:ask" olayını yayınlıyoruz, ChatWidget bu olayı dinliyor.

import { useState } from "react";

const EXAMPLES = [
  "40 bin TL altı oyun laptopu",
  "Annem için kullanımı kolay bir telefon",
  "Video kurgu için güçlü bir masaüstü",
];

export function askAssistant(text) {
  window.dispatchEvent(new CustomEvent("tv:ask", { detail: text }));
}

export default function HeroAsk() {
  const [text, setText] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    askAssistant(text.trim());
    setText("");
  }

  return (
    <div className="mt-8 max-w-xl">
      <form onSubmit={submit} className="flex gap-2 rounded-xl bg-white/10 p-1.5 ring-1 ring-white/15 focus-within:ring-glacier/60">
        <label htmlFor="hero-ask" className="sr-only">Asistana sor</label>
        <input
          id="hero-ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Örneğin: üniversite için hafif bir laptop"
          className="min-w-0 flex-1 bg-transparent px-3 text-white placeholder:text-white/40 outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-glacier px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white"
        >
          Asistana sor
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/55">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => askAssistant(example)}
            className="underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-glacier"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
