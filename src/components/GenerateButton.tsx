"use client";
import { useState } from "react";

export default function GenerateButton({ keywordId, sourceIds }: { keywordId: string; sourceIds: string[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setMessage("Generating article... please wait.");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywordId,
          sourceIds,
          language: "en",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");

      setMessage(`✅ Generated successfully! Article ID: ${data.articleId || "unknown"}`);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`px-5 py-2 rounded-lg text-white font-semibold ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Generating..." : "Generate Article"}
      </button>
      {message && <p className="text-sm text-gray-700 mt-2">{message}</p>}
    </div>
  );
}
