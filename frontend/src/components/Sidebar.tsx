"use client";

import React, { useState } from "react";
import { fetchProfile, updateProfile, clearHistory } from "@/lib/api";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onHistoryClear: () => void;
}

export default function Sidebar({ currentPage, onPageChange, onHistoryClear }: SidebarProps) {
  const [profile, setProfile] = useState({ name: "" });
  const [showDev, setShowDev] = useState(false);

  const handleClearHistory = async () => {
    await clearHistory();
    onHistoryClear();
  };

  return (
    <aside className="w-64 h-screen p-4 flex flex-col gap-4 border-r"
           style={{ borderColor: "var(--border-dark)" }}>
      <h2 className="text-xl font-bold">Re-Hardwire</h2>
      <nav className="flex flex-col gap-2">
        <button onClick={() => onPageChange("chat")}
                className="px-4 py-2 rounded-lg text-left transition-colors"
                style={{ background: currentPage === "chat" ? "var(--accent)" : "transparent",
                         color: currentPage === "chat" ? "white" : "inherit" }}>
          Chat
        </button>
        <button onClick={() => onPageChange("routing-lab")}
                className="px-4 py-2 rounded-lg text-left transition-colors"
                style={{ background: currentPage === "routing-lab" ? "var(--accent)" : "transparent",
                         color: currentPage === "routing-lab" ? "white" : "inherit" }}>
          Routing Lab
        </button>
        <button onClick={() => onPageChange("protocol-tuning")}
                className="px-4 py-2 rounded-lg text-left transition-colors"
                style={{ background: currentPage === "protocol-tuning" ? "var(--accent)" : "transparent",
                         color: currentPage === "protocol-tuning" ? "white" : "inherit" }}>
          Protocol Tuning
        </button>
      </nav>
      <div className="mt-auto">
        <button onClick={() => setShowDev(!showDev)} className="text-sm subtext">
          Developer Mode
        </button>
        {showDev && (
          <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: "rgba(255,0,0,0.1)" }}>
            Dev tools here
          </div>
        )}
      </div>
    </aside>
  );
}
