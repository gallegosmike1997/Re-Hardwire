"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { Message, fetchHistory } from "@/lib/api";

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const history = await fetchHistory();
      setMessages(history);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView(); }, [messages]);

  const handleSendMessage = async (text: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, ts: Date.now() },
      { role: "assistant", content: "", ts: Date.now() }
    ]);
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(API_BASE + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (part.startsWith("data: ")) {
            try {
              const payload = JSON.parse(part.slice(6));
              if (payload.type === "token") {
                setMessages((prev) => {
                  const u = [...prev];
                  const last = u[u.length - 1];
                  if (last && last.role === "assistant") {
                    u[u.length - 1] = { ...last, content: last.content + payload.data };
                  }
                  return u;
                });
              } else if (payload.type === "done") {
                loadHistory();
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={(theme === "dark" ? "theme-dark" : "theme-light") + " min-h-screen flex"}>
      <Sidebar currentPage="chat" onPageChange={() => {}} onHistoryClear={() => setMessages([])} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          title="Re-Hardwire"
          theme={theme}
          onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} theme={theme} />
          ))}
          {loading && (
            <div className="chat-bubble-assistant rounded-2xl p-4 mb-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.1s" }} />
                <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <ChatInput onSend={handleSendMessage} disabled={loading} />
      </main>
    </div>
  );
}
