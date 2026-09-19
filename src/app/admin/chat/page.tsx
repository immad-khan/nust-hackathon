"use client";

import { useEffect, useRef, useState } from "react";
import { AdminShell, getAdminAuthHeaders } from "@/components/admin-shell";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
};

const SUGGESTED_PROMPTS = [
  "Show me today's orders",
  "Which products are low on stock?",
  "What's our total revenue this week?",
  "List our best-selling products",
  "Sync latest orders to Notion",
  "How many pending orders do we have?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI store assistant for **Prem by SHK**. I can help you manage orders, check inventory, view analytics, and sync data to Notion.\n\nTry asking me something like:\n- *\"Show me today's orders\"*\n- *\"Which products are low on stock?\"*\n- *\"Sync latest orders to Notion\"*",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function sendMessage(content?: string) {
    const text = (content ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { reply: string };

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.reply || "I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: `⚠️ ${error instanceof Error ? error.message : "Something went wrong. Please try again."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function clearChat() {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Chat cleared. How can I help you with your store?",
        timestamp: new Date(),
      },
    ]);
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  /** Render markdown-ish text: **bold**, *italic*, \n, - lists */
  function renderContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // List items
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-2 pl-1">
            <span className="text-rose-light select-none">•</span>
            <span>{renderInline(line.slice(2))}</span>
          </div>
        );
      }
      // Empty lines become spacing
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      return (
        <p key={i}>{renderInline(line)}</p>
      );
    });
  }

  function renderInline(text: string) {
    // Handle **bold** and *italic*
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="text-ink-soft italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <AdminShell
      eyebrow="Studio CRM"
      title="AI Assistant"
      description="Chat with AI to manage orders, inventory, analytics, and Notion syncs."
      actions={
        <button
          onClick={clearChat}
          className="rounded-sm border border-line bg-cream px-4 py-2 text-[0.62rem] tracking-[0.16em] uppercase text-ink transition hover:bg-blush-soft"
        >
          ↻ Clear Chat
        </button>
      }
    >
      <div className="flex flex-col rounded-sm border border-line bg-cream shadow-sm overflow-hidden" style={{ height: "calc(100vh - 320px)", minHeight: "480px" }}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-5 no-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[72%] ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-sm bg-rose-deep text-cream px-4 py-3 shadow-sm"
                    : "rounded-2xl rounded-bl-sm bg-blush-soft border border-line/60 text-ink px-4 py-3"
                }`}
              >
                {/* Role indicator */}
                <div className="flex items-center gap-2 mb-1.5">
                  {msg.role === "assistant" ? (
                    <span className="inline-flex items-center gap-1 text-[0.58rem] tracking-[0.18em] uppercase font-medium text-rose">
                      <span className="text-sm">✨</span> AI Assistant
                    </span>
                  ) : (
                    <span className="text-[0.58rem] tracking-[0.18em] uppercase font-medium text-cream/70">
                      You
                    </span>
                  )}
                  <span
                    className={`text-[0.52rem] tracking-wider ${
                      msg.role === "user" ? "text-cream/50" : "text-muted/60"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* Content */}
                <div
                  className={`text-sm leading-relaxed space-y-1 ${
                    msg.role === "user" ? "text-cream/95" : "text-ink-soft"
                  }`}
                >
                  {renderContent(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-up">
              <div className="rounded-2xl rounded-bl-sm bg-blush-soft border border-line/60 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <div className="flex gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full bg-rose-light animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-rose-light animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-rose-light animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-[0.6rem] tracking-[0.16em] uppercase text-muted ml-1">
                    Thinking…
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 1 && (
          <div className="border-t border-line/40 bg-cream/60 px-4 py-3 sm:px-6">
            <p className="text-[0.58rem] tracking-[0.2em] uppercase text-muted font-medium mb-2">
              Suggested prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-line bg-cream px-3 py-1.5 text-xs text-ink-soft transition hover:border-rose-light hover:bg-blush-soft hover:text-rose-deep"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-line bg-cream px-4 py-3 sm:px-6">
          <div className="flex items-end gap-3">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about orders, inventory, analytics…"
                rows={1}
                className="w-full resize-none rounded-xl border border-line bg-blush-soft/50 px-4 py-3 pr-12 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-rose-light focus:bg-cream focus:ring-1 focus:ring-rose-light/30"
                disabled={isLoading}
              />
              {/* Character count */}
              {input.length > 100 && (
                <span className="absolute bottom-1.5 right-14 text-[0.5rem] text-muted/50">
                  {input.length}
                </span>
              )}
            </div>
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-deep text-cream shadow-sm transition hover:bg-rose disabled:opacity-40 disabled:hover:bg-rose-deep"
              aria-label="Send message"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[0.52rem] tracking-[0.14em] uppercase text-muted/50">
            Powered by Groq · Shift+Enter for new line
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
