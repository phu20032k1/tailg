"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, MessageCircle, Send, X } from "lucide-react";
import type { SessionUser } from "@/lib/types";

type Contact = {
  id: string;
  full_name: string;
  role: "commander" | "leader";
  unread: number;
  latest: { message: string; created_at: string } | null;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ChatPopup({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [active, setActive] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function loadContacts() {
    try {
      const response = await fetch("/api/chat", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      setContacts(result.users || []);
      setTotalUnread(result.totalUnread || 0);
    } catch {}
  }

  async function loadMessages(peer: Contact, markRead = false) {
    try {
      const response = await fetch(`/api/chat?peer=${peer.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      setMessages(result.messages || []);
      if (markRead || peer.unread > 0) {
        await fetch("/api/chat", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ peerId: peer.id })
        });
        await loadContacts();
      }
    } catch {}
  }

  useEffect(() => {
    loadContacts();
    const timer = window.setInterval(loadContacts, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open || !active) return;
    loadMessages(active, true);
    const timer = window.setInterval(() => loadMessages(active), 3500);
    return () => window.clearInterval(timer);
  }, [open, active?.id]);

  useEffect(() => {
    if (!open || !active) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open, active?.id]);

  useEffect(() => {
    if (!open || !active) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open, active?.id]);

  const orderedContacts = useMemo(
    () =>
      [...contacts].sort((a, b) => {
        if (a.unread !== b.unread) return b.unread - a.unread;
        const ta = a.latest?.created_at ? new Date(a.latest.created_at).getTime() : 0;
        const tb = b.latest?.created_at ? new Date(b.latest.created_at).getTime() : 0;
        if (ta !== tb) return tb - ta;
        return a.full_name.localeCompare(b.full_name, "vi");
      }),
    [contacts]
  );

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!active || !text.trim() || sending) return;

    const content = text.trim();
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientId: active.id, message: content })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chưa gửi được tin nhắn.");

      setText("");
      setMessages((items) => [...items, result.message]);
      await loadContacts();
      window.setTimeout(() => inputRef.current?.focus(), 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget" aria-live="polite">
      {open ? (
        <section className="chat-popup" aria-label="Tin nhắn nội bộ">
          <header className="chat-popup-head">
            <div className="chat-head-title">
              {active ? (
                <button className="chat-back" type="button" onClick={() => setActive(null)} aria-label="Quay lại">
                  <ChevronLeft size={21} />
                </button>
              ) : (
                <MessageCircle size={20} />
              )}
              <div>
                <strong>{active ? active.full_name : "Tin nhắn nội bộ"}</strong>
                <span>
                  {active
                    ? active.role === "commander"
                      ? "Chỉ huy trưởng"
                      : "Đội trưởng"
                    : "Trao đổi giữa Ban điều hành và các đội"}
                </span>
              </div>
            </div>
            <button className="chat-close" type="button" onClick={() => setOpen(false)} aria-label="Đóng tin nhắn">
              <X size={20} />
            </button>
          </header>

          {!active ? (
            <div className="chat-contact-list">
              {orderedContacts.map((contact) => (
                <button
                  key={contact.id}
                  className="chat-contact"
                  type="button"
                  onClick={() => {
                    setActive(contact);
                    setError("");
                    setText("");
                  }}
                >
                  <span className="chat-avatar">{initials(contact.full_name)}</span>
                  <span className="chat-contact-copy">
                    <strong>{contact.full_name}</strong>
                    <small>{contact.latest?.message || (contact.role === "commander" ? "Chỉ huy trưởng" : "Đội trưởng")}</small>
                  </span>
                  <span className="chat-contact-meta">
                    {contact.latest ? <small>{timeLabel(contact.latest.created_at)}</small> : null}
                    {contact.unread ? <b>{contact.unread > 99 ? "99+" : contact.unread}</b> : null}
                  </span>
                </button>
              ))}
              {!orderedContacts.length ? <div className="chat-empty">Chưa có người dùng khác.</div> : null}
            </div>
          ) : (
            <>
              <div className="chat-thread">
                {messages.map((message) => {
                  const mine = message.sender_id === user.id;
                  return (
                    <div key={message.id} className={`chat-message-row ${mine ? "mine" : "theirs"}`}>
                      <div className="chat-bubble">
                        <span>{message.message}</span>
                        <small>
                          {timeLabel(message.created_at)}
                          {mine && message.read_at ? " · Đã xem" : ""}
                        </small>
                      </div>
                    </div>
                  );
                })}
                {!messages.length ? <div className="chat-empty">Chưa có tin nhắn. Bạn có thể bắt đầu cuộc trao đổi.</div> : null}
                <div ref={endRef} />
              </div>

              <form className="chat-compose" onSubmit={sendMessage}>
                {error ? <div className="chat-error">{error}</div> : null}
                <div>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    maxLength={2000}
                    value={text}
                    onChange={(event) => setText(event.currentTarget.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(event) => {
                      setIsComposing(false);
                      setText(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !isComposing && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    onPointerDown={(event) => event.currentTarget.focus()}
                    placeholder={`Nhắn cho ${active.full_name}...`}
                    autoComplete="off"
                    spellCheck
                    aria-label={`Nhắn cho ${active.full_name}`}
                  />
                  <button type="submit" disabled={sending || !text.trim()} aria-label="Gửi tin nhắn">
                    <Send size={19} />
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      ) : null}

      <button
        className="chat-launcher"
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) loadContacts();
        }}
        aria-label="Mở tin nhắn"
      >
        <MessageCircle size={25} />
        <span>Tin nhắn</span>
        {totalUnread ? <b className="chat-unread-badge">{totalUnread > 99 ? "99+" : totalUnread}</b> : null}
      </button>
    </div>
  );
}
