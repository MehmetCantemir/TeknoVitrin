"use client";
// Ürün sayfasından asistana bu ürün hakkında soru sorar.
import { askAssistant } from "@/components/HeroAsk";

export default function AskAboutButton({ productName }) {
  return (
    <button
      type="button"
      onClick={() => askAssistant(`${productName} bana uygun mu? Kısaca artılarını ve eksilerini anlatır mısın?`)}
      className="mt-6 w-fit rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy"
    >
      Bu ürünü asistana sor
    </button>
  );
}
