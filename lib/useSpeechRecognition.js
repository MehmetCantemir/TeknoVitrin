"use client";
// Tarayıcının yerleşik konuşma tanıma özelliğini (Web Speech API) saran bir React "hook"u.
// Chrome ve Edge'de çalışır; Firefox desteklemez (o durumda mikrofon butonu gizlenir).
// Not: Chrome sesi tanımak için Google sunucularını kullanır, bu yüzden internet gerekir.

import { useEffect, useRef, useState } from "react";

const ERROR_MESSAGES = {
  "not-allowed": "Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin verebilirsin.",
  "service-not-allowed": "Bu tarayıcıda ses tanıma kullanılamıyor.",
  "no-speech": "Ses algılanmadı, tekrar dener misin?",
  "audio-capture": "Mikrofon bulunamadı.",
  network: "Ses tanıma için internet bağlantısı gerekiyor.",
};

export default function useSpeechRecognition({ lang = "tr-TR", onResult } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState(""); // konuşurken anlık metin
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);

  // onResult her render'da yeni bir fonksiyon olabilir; en güncelini saklıyoruz.
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    // window sadece tarayıcıda vardır; bu yüzden kontrolü useEffect içinde yapıyoruz.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setSupported(true);

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true; // konuşma bitmeden ara sonuçları da ver
    recognition.continuous = false; // bir cümle bitince dinlemeyi durdur

    let finalText = "";

    recognition.onstart = () => {
      finalText = "";
      setTranscript("");
      setError(null);
      setListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      setError(ERROR_MESSAGES[event.error] ?? "Ses tanımada bir sorun oluştu.");
    };

    recognition.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (text) onResultRef.current?.(text);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onend = null;
      recognition.abort();
    };
  }, [lang]);

  function start() {
    try {
      recognitionRef.current?.start();
    } catch {
      // Zaten dinliyorsa start() hata fırlatır; görmezden geliyoruz.
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { supported, listening, transcript, error, start, stop };
}
