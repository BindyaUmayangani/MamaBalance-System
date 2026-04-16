"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Info, Search, SendHorizonal } from "lucide-react";
import "@/app/doctor/styles/Messaging.css";

type ChatPreview = {
  id: string;
  motherUid: string;
  motherName: string;
  lastMessageText: string;
  role: string;
  lastMessageAt: string | null;
  lastMessageSenderUid: string;
  unread: boolean;
};

type ChatMessage = {
  id: string;
  senderUid: string;
  senderRole: string;
  text: string;
  createdAt: string | null;
};

type MessagingResponse = {
  conversations: ChatPreview[];
  activeConversationId?: string;
  messages: ChatMessage[];
  currentStaff?: {
    uid: string;
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
  };
};

type CurrentUserResponse = {
  user?: {
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MidwifeMessagingPage() {
  const [conversations, setConversations] = useState<ChatPreview[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [staffInitial, setStaffInitial] = useState("S");
  const [staffUid, setStaffUid] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeChatId) || null;
  const unreadCount = conversations.filter((conversation) => conversation.unread).length;

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      conversation.motherName.toLowerCase().includes(query),
    );
  }, [conversations, search]);

  async function loadMessages(conversationId = activeChatId) {
    setError("");
    const suffix = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
    const response = await fetch(`/api/midwife/messaging${suffix}`, { cache: "no-store" });
    const payload = (await response.json()) as MessagingResponse & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load messages.");
    }

    setConversations(payload.conversations || []);
    setMessages(payload.messages || []);
    setActiveChatId(payload.activeConversationId || payload.conversations?.[0]?.id || "");
    if (payload.currentStaff) {
      setStaffUid(payload.currentStaff.uid);
      setStaffInitial(
        initial(
          payload.currentStaff.displayName ||
            payload.currentStaff.username ||
            payload.currentStaff.email ||
            "Staff",
        ),
      );
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: CurrentUserResponse) => {
        if (!isMounted) return;
        const name =
          payload.user?.displayName ||
          payload.user?.username ||
          payload.user?.email ||
          "Staff";
        setStaffInitial(initial(name));
      })
      .catch(() => undefined);

    loadMessages()
      .catch((loadError) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeChatId) return;

    const interval = window.setInterval(() => {
      loadMessages(activeChatId).catch(() => undefined);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [activeChatId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function selectConversation(conversationId: string) {
    setActiveChatId(conversationId);
    setLoading(true);
    try {
      await loadMessages(conversationId);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversation) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/midwife/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motherUid: activeConversation.motherUid, text }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to send message.");
      }

      setDraft("");
      await loadMessages(activeConversation.id);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="messaging-page">
      <div className="role-header">
        <h1>Messaging</h1>
        <p>Keep in touch with assigned mothers and review recent care conversations.</p>
      </div>

      <div className="messaging-layout">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div>
              <h2>Conversations</h2>
              <p>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
            </div>
            <span className="chat-count">{conversations.length}</span>
          </div>

          <div className="search-box chat-search">
            <Search size={18} />
            <input placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <div className="chat-preview-list">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={conversation.id === activeChatId ? "chat-preview active" : "chat-preview"}
                onClick={() => selectConversation(conversation.id)}
                type="button"
              >
                <div className="chat-avatar-wrap">
                  <div className="chat-avatar">{initial(conversation.motherName)}</div>
                </div>

                <div className="chat-preview-copy">
                  <div className="chat-preview-top">
                    <strong>{conversation.motherName}</strong>
                    <span className="chat-preview-time">{formatTime(conversation.lastMessageAt)}</span>
                  </div>
                  <span className="chat-preview-role">{conversation.role}</span>
                  <div className="chat-preview-bottom">
                    <span>{conversation.lastMessageText}</span>
                    {conversation.unread && <span className="chat-unread-badge">New</span>}
                  </div>
                </div>
              </button>
            ))}
            {!loading && filteredConversations.length === 0 && (
              <div className="chat-empty-state">
                <span>No assigned mothers found.</span>
              </div>
            )}
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-user-meta">
              <div className="chat-avatar large">{initial(activeConversation?.motherName || "")}</div>
              <div>
                <h2>{activeConversation?.motherName || "Secure messaging"}</h2>
                <span className="chat-status">{activeConversation?.role || "Select a mother"}</span>
              </div>
            </div>

            <div className="chat-panel-actions">
              <span className="secure-chat-pill">Secure care chat</span>
              <button type="button" className="chat-info-btn" aria-label="Chat information">
                <Info size={18} />
              </button>
            </div>
          </div>

          <div className="chat-thread" ref={threadRef}>
            {error && <div className="chat-error-state">{error}</div>}
            {loading && <div className="chat-empty-state">Loading messages...</div>}
            {!loading && activeConversation && messages.length === 0 && (
              <div className="chat-empty-state roomy">
                <strong>Start the secure conversation</strong>
                <span>Send care guidance, check on symptoms, or follow up after a visit.</span>
              </div>
            )}
            {messages.map((message) => {
              const isMidwife =
                message.senderUid === staffUid || message.senderRole === "midwife";
              const motherInitial = initial(activeConversation?.motherName || "");

              return (
                <div
                  key={message.id}
                  className={isMidwife ? "message-row outgoing" : "message-row incoming"}
                >
                  {!isMidwife && <div className="message-badge">{motherInitial}</div>}

                  <div className="message-group">
                    <div className={isMidwife ? "message-bubble outgoing" : "message-bubble incoming"}>
                      {message.text}
                    </div>
                    <span className={isMidwife ? "message-time outgoing" : "message-time incoming"}>
                      {formatTime(message.createdAt)}
                    </span>
                  </div>

                  {isMidwife && <div className="message-badge doctor">{staffInitial}</div>}
                </div>
              );
            })}
          </div>

          <form className="message-composer" onSubmit={sendMessage}>
            <input
              placeholder={activeConversation ? "Type a message" : "Select a mother to message"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!activeConversation || sending}
            />
            <button
              type="submit"
              className="send-btn"
              aria-label="Send message"
              disabled={!activeConversation || sending || !draft.trim()}
            >
              <SendHorizonal size={22} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
