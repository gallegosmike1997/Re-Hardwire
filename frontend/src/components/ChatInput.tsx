"use client";

import React, { useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--border-dark)" }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        disabled={disabled}
        rows={2}
        className="flex-1 rounded-xl p-3 resize-none text-sm"
        style={{ background: "var(--card-dark)", border: "1px solid var(--border-dark)", color: "inherit" }}
      />
      <button type="submit" disabled={disabled || !text.trim()}
        className="px-6 py-2 rounded-xl font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--accent)" }}>Send</button>
    </form>
  );
}
