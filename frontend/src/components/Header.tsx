"use client";

import React from "react";

interface HeaderProps {
  title: string;
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

export default function Header({ title, theme, onThemeToggle }: HeaderProps) {
  return (
    <div className="glass-card text-center mb-8">
      <div className="w-[72px] h-[72px] rounded-full bg-white/8 border border-white/12 flex items-center justify-center mx-auto mb-4"
           style={{ boxShadow: "0 4px 12px rgba(13,148,136,0.35)" }}>
        <div className="w-[42px] h-[42px] rounded-full bg-accent/30" />
      </div>
      <h1 className="text-4xl font-black uppercase tracking-tight header-glow"
          style={{ 
            background: "linear-gradient(180deg, #FFFFFF 10%, #F4F4F5 50%, #A1A1AA 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
        {title}
      </h1>
      <p className="text-xs subtext mt-2 tracking-wide uppercase font-semibold">
        Adaptive Cognitive Routing Engine • CBT • DBT • ACT • Somatic
      </p>
      <button onClick={onThemeToggle} className="absolute top-4 right-4 px-3 py-1 rounded-lg text-sm"
              style={{ background: "var(--accent)", color: "white" }}>
        {theme === "dark" ? "Light" : "Dark"} Mode
      </button>
    </div>
  );
}
