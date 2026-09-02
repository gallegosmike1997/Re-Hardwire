"use client";

import React from "react";
import { Message } from "@/lib/api";

interface ChatMessageProps {
  message: Message;
  theme: "dark" | "light";
}

export default function ChatMessage({ message, theme }: ChatMessageProps) {
  const isUser = message.role === "user";
  const routing = message.routing_details;

  return (
    <div className="mb-3">
      <div className={(isUser ? "chat-bubble-user" : "chat-bubble-assistant") + " rounded-2xl p-4"}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase">
            {isUser ? "You" : "Assistant"}
          </span>
          {routing && !isUser && (
            <span className="protocol-badge">{routing.protocol}</span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {routing && !isUser && (
          <p className="text-xs subtext mt-2">
            Reason: {routing.reason} | Score: {routing.score.toFixed(3)}
          </p>
        )}
      </div>
    </div>
  );
}
