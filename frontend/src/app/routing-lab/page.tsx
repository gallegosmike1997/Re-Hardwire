"use client";

import React, { useState } from "react";
import { testRoute, RoutingResult } from "@/lib/api";

export default function RoutingLab() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<RoutingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunRouting = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await testRoute(text);
      setResult(res);
    } catch (err) {
      console.error("Routing error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-dark min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Routing Lab</h1>
        <p className="subtext mb-6">Test how the adaptive routing engine responds to text input.</p>
        <div className="glass-card mb-6">
          <h3 className="text-lg font-semibold mb-3">Input</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to test routing..."
            rows={5}
            className="w-full rounded-xl p-3 resize-none text-sm mb-4"
            style={{ background: "var(--card-dark)", border: "1px solid var(--border-dark)", color: "inherit" }}
          />
          <button onClick={handleRunRouting} disabled={loading || !text.trim()}
            className="px-6 py-2 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}>
            {loading ? "Running..." : "Run Routing"}
          </button>
        </div>
        {result && (
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4">Routing Result</h3>
            <div className="mb-4"><span className="protocol-badge text-lg">{result.protocol}</span></div>
            <div className="mb-4">
              <p className="text-sm subtext mb-1">Confidence Score</p>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width:  }} />
              </div>
              <p className="text-sm mt-1">{(result.score * 100).toFixed(1)}%</p>
            </div>
            <div className="mb-4">
              <p className="text-sm subtext mb-1">Reason</p>
              <p className="text-sm">{result.reason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
