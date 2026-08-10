"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  senderType: "VISITOR" | "STAFF";
  body: string;
  createdAt: string;
};

// No websocket/SSE infra in this app — plain polling is the simplest thing
// that fits the existing server-actions-and-page-refresh stack. 4s keeps
// the chat feeling responsive without hammering the DB.
const POLL_INTERVAL_MS = 4000;

// Shared by both chat surfaces (visitor's /visit/[token] and staff's
// /staff/visits/[id]/chat) — apiUrl points at whichever backend route
// applies, viewerType decides which side of the thread is "self".
export function ChatBox({ apiUrl, viewerType }: { apiUrl: string; viewerType: "VISITOR" | "STAFF" }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setMessages(data.messages ?? []);
      } catch {
        // Network hiccup — the next poll will just retry.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send message.");
        return;
      }
      // Append immediately rather than waiting for the next poll tick, so
      // your own message shows up right away instead of after ~4s.
      setMessages((prev) => [...prev, data.message]);
      setText("");
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.length === 0 && <p className="chat-empty">No messages yet.</p>}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.senderType === viewerType ? "chat-message-self" : "chat-message-other"}`}
          >
            <p>{message.body}</p>
            <span className="chat-message-time">{new Date(message.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-row">
        <input
          className="form-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
