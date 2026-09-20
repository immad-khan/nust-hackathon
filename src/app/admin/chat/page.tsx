"use client";

import { useEffect, useRef, useState } from "react";
import { AdminShell, getAdminAuthHeaders } from "@/components/admin-shell";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
  timestamp: Date;
  createdProduct?: any;
};

const SUGGESTED_PROMPTS = [
  "Add a new product from image",
  "Which products are low on stock?",
  "Show me today's orders",
  "What's our total revenue this week?",
  "List our best-selling products",
  "How many pending orders do we have?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI store assistant for **Prem by SHK**.\n\nI can help you manage orders, monitor inventory, analyze sales, and **add new products directly to your store**!\n\n✨ **To add a product:**\n- Paste an image here (`Ctrl+V`) or click the 📷 button\n- Tell me the name, price, and category (or ask me for recommendations)\n- I will review the requirements with you and publish it to the database & sync log when confirmed!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stagedImages, setStagedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function uploadImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10 MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          fileName: file.name || "pasted-image.jpg",
          mimeType: file.type || "image/jpeg",
          dataBase64: base64,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (${res.status})`);
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        setStagedImages((prev) => [...prev, data.url!]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to upload image to Cloudinary");
    } finally {
      setIsUploadingImage(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          void uploadImageFile(file);
        }
      }
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        void uploadImageFile(files[i]);
      }
    }
    e.target.value = "";
  }

  function removeStagedImage(index: number) {
    setStagedImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function sendMessage(content?: string) {
    const text = (content ?? input).trim();
    const imagesToSend = [...stagedImages];

    if ((!text && imagesToSend.length === 0) || isLoading) return;

    const messageText =
      text || (imagesToSend.length > 0 ? "I've uploaded an image for a new product. Please help me list it." : "");

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: messageText,
      images: imagesToSend.length > 0 ? imagesToSend : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStagedImages([]);
    setIsLoading(true);

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
              .map((m) => ({
                role: m.role,
                content: m.content,
                images: m.images,
              })),
            {
              role: "user",
              content: messageText,
              images: imagesToSend.length > 0 ? imagesToSend : undefined,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as {
        reply: string;
        createdProduct?: any;
      };

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.reply || "I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        createdProduct: data.createdProduct,
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

  function renderInline(text: string) {
    // Support markdown links [label](url), **bold**, *italic*, `code`
    const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    const parts = text.split(tokenRegex);
    return parts.map((part, i) => {
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          return (
            <a
              key={i}
              href={match[2]}
              target={match[2].startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="font-medium text-rose-deep underline decoration-rose-light hover:text-rose transition"
            >
              {match[1]}
            </a>
          );
        }
      }
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
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="rounded bg-blush-soft px-1.5 py-0.5 text-xs font-mono text-rose-deep border border-line/40"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  function renderContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-2 pl-1">
            <span className="text-rose-light select-none">•</span>
            <span>{renderInline(line.slice(2))}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      return <p key={i}>{renderInline(line)}</p>;
    });
  }

  function renderMessageBody(msg: Message) {
    let content = msg.content;
    let proposedData: any = null;

    const proposeMatch = content.match(/```action:propose_product\s*([\s\S]*?)\s*```/);
    if (proposeMatch) {
      try {
        proposedData = JSON.parse(proposeMatch[1].trim());
        content = content.replace(/```action:propose_product\s*[\s\S]*?\s*```/, "").trim();
      } catch {
        // ignore json parse error
      }
    }

    return (
      <div className="space-y-3">
        {/* Attached Images */}
        {msg.images && msg.images.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 pb-1">
            {msg.images.map((imgUrl, idx) => (
              <a
                key={idx}
                href={imgUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-xl border border-line/80 bg-cream shadow-xs hover:ring-2 hover:ring-rose-light"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt="Product visual"
                  className="h-28 w-28 object-cover transition group-hover:scale-105"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[0.55rem] text-white">
                  Cloudinary
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Text Body */}
        <div className="space-y-1">{renderContent(content)}</div>

        {/* Proposed Product Card */}
        {proposedData && (
          <div className="mt-3 rounded-xl border border-rose/30 bg-cream/95 p-3.5 shadow-sm text-ink space-y-3">
            <div className="flex items-start gap-3">
              {proposedData.images && proposedData.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proposedData.images[0]}
                  alt={proposedData.name}
                  className="h-16 w-16 rounded-lg object-cover border border-line shrink-0"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blush-soft border border-line text-2xl shrink-0">
                  💎
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-ink truncate">
                    {proposedData.name || "Untitled Product"}
                  </h4>
                  {proposedData.categorySlug && (
                    <span className="rounded-full bg-blush-soft px-2 py-0.5 text-[0.6rem] font-medium tracking-wider uppercase text-rose-deep border border-line/50">
                      {proposedData.categorySlug}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  <span className="font-semibold text-rose-deep">
                    {proposedData.price > 0
                      ? `PKR ${Number(proposedData.price).toLocaleString()}`
                      : "Price not set"}
                  </span>
                  {proposedData.stock ? ` · ${proposedData.stock} units in stock` : ""}
                </p>
                {proposedData.material && (
                  <p className="text-[0.68rem] text-muted truncate mt-0.5">
                    Material: {proposedData.material}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line/40">
              <span className="text-[0.62rem] tracking-wider uppercase text-muted">
                Requirements ready
              </span>
              <button
                onClick={() =>
                  void sendMessage(
                    `Add this product to the store catalog: ${proposedData.name}, Price: PKR ${proposedData.price || 30000}, Category: ${proposedData.categorySlug || "earrings"}, Stock: ${proposedData.stock || 20}`
                  )
                }
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-deep px-3.5 py-1.5 text-xs font-medium text-cream shadow-sm transition hover:bg-rose disabled:opacity-50"
              >
                <span>✓</span> Confirm & Add to Store
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <AdminShell
      eyebrow="Studio CRM"
      title="AI Assistant"
      description="Chat with AI to manage orders, inventory, analytics, and add products from images."
      actions={
        <button
          onClick={clearChat}
          className="rounded-sm border border-line bg-cream px-4 py-2 text-[0.62rem] tracking-[0.16em] uppercase text-ink transition hover:bg-blush-soft"
        >
          ↻ Clear Chat
        </button>
      }
    >
      <div
        className="flex flex-col rounded-sm border border-line bg-cream shadow-sm overflow-hidden"
        style={{ height: "calc(100vh - 320px)", minHeight: "520px" }}
      >
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-5 no-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] ${
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
                  className={`text-sm leading-relaxed ${
                    msg.role === "user" ? "text-cream/95" : "text-ink-soft"
                  }`}
                >
                  {renderMessageBody(msg)}
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
                    Groq AI Thinking…
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

        {/* Staged Images Preview Strip */}
        {(stagedImages.length > 0 || isUploadingImage) && (
          <div className="flex items-center gap-3 border-t border-line/50 bg-blush-soft/40 px-4 py-2 sm:px-6 overflow-x-auto no-scrollbar">
            {stagedImages.map((url, i) => (
              <div key={i} className="relative group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Staged"
                  className="h-16 w-16 rounded-lg object-cover border border-line shadow-xs"
                />
                <button
                  onClick={() => removeStagedImage(i)}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-deep text-white text-xs shadow-sm hover:bg-rose transition"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            ))}
            {isUploadingImage && (
              <div className="flex h-16 w-28 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-rose-light bg-cream/70 text-[0.62rem] text-rose-deep">
                <span className="animate-spin text-sm">↻</span>
                <span className="mt-1">Cloudinary…</span>
              </div>
            )}
            <span className="text-[0.65rem] text-muted ml-1 shrink-0">
              {stagedImages.length} image{stagedImages.length > 1 ? "s" : ""} attached to prompt
            </span>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-line bg-cream px-4 py-3 sm:px-6">
          <div className="flex items-end gap-2.5">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attach Image Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-blush-soft text-ink-soft transition hover:border-rose-light hover:text-rose-deep disabled:opacity-40"
              title="Attach product image (or paste with Ctrl+V)"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>

            {/* Textarea with Paste Listener */}
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ask anything or paste product image (Ctrl+V) to add..."
                rows={1}
                className="w-full resize-none rounded-xl border border-line bg-blush-soft/50 px-4 py-3 pr-12 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-rose-light focus:bg-cream focus:ring-1 focus:ring-rose-light/30"
                disabled={isLoading}
              />
              {input.length > 100 && (
                <span className="absolute bottom-1.5 right-14 text-[0.5rem] text-muted/50">
                  {input.length}
                </span>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={() => void sendMessage()}
              disabled={(!input.trim() && stagedImages.length === 0) || isLoading || isUploadingImage}
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
            Powered by Groq · Paste image with Ctrl+V · Shift+Enter for new line
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
