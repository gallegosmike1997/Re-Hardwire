"use client";

import React, { useState, useEffect } from "react";
import { fetchState, updateWeights, testRoute } from "@/lib/api";

export default function ProtocolTuning() {
  const [weights, setWeights] = useState({ semantic: 0.5, keyword: 0.3, recency: 0.1, user_pref: 0.1 });
  const [previewText, setPreviewText] = useState("");
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchState().then((s) => setWeights(s.routing_weights)).catch(console.error);
  }, []);

  const handleWeightChange = (key: string, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleApply = async () => {
    try { await updateWeights(weights); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (err) { console.error(err); }
  };

  const handlePreview = async () => {
    if (!previewText.trim()) return;
    try { const r = await testRoute(previewText); setPreviewResult(); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="theme-dark min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Protocol Tuning</h1>
        <p className="subtext mb-6">Adjust how Re-Hardwire blends signals.</p>
        <div className="glass-card mb-6">
          <h3 className="text-lg font-semibold mb-4">Routing Weights</h3>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(weights).map(([key, val]) => (
              <div key={key}>
                <label className="text-sm subtext capitalize">{key}</label>
                <input type="range" min="0" max="1" step="0.01" value={val}
                  onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))} className="w-full mt-1" />
                <p className="text-xs mt-1">{(val * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
          <button onClick={handleApply} className="mt-4 px-6 py-2 rounded-xl font-semibold text-white"
            style={{ background: "var(--accent)" }}>{saved ? "Saved!" : "Apply Weights"}</button>
        </div>
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
          <textarea value={previewText} onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Enter text to preview routing..." rows={3}
            className="w-full rounded-xl p-3 resize-none text-sm mb-3"
            style={{ background: "var(--card-dark)", border: "1px solid var(--border-dark)", color: "inherit" }} />
          <button onClick={handlePreview} disabled={!previewText.trim()}
            className="px-6 py-2 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}>Run Preview</button>
          {previewResult && (
            <div className="mt-4 p-3 rounded-lg bg-accent/20"><p className="text-sm">{previewResult}</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
