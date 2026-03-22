import { useState, useEffect, useRef } from "react";
import Avatar from "../ui/Avatar";
import api from "../../lib/api";

const REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🎉"];

const ChatPanel = ({ messages, onSend, onSendFile, onReact, currentUserId }) => {
  const [input,       setInput]       = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [reactingTo,  setReactingTo]  = useState(null); // messageId
  const bottomRef  = useRef(null);
  const fileRef    = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10 MB guard on client
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        onSendFile(res.data.file);
      }
    } catch (err) {
      alert("File upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset so same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-800 flex-shrink-0">
        <h3 className="font-semibold text-white text-sm">Meeting Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-slate-600 mb-2" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="text-slate-500 text-xs">No messages yet</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

          return (
            <div
              key={msg.id}
              className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}
            >
              {!isOwn && (
                <Avatar
                  user={{ name: msg.senderName, avatar: msg.senderAvatar }}
                  size="xs"
                  className="mt-0.5 flex-shrink-0"
                />
              )}

              <div className={`max-w-[82%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && (
                  <span className="text-xs text-slate-500 mb-0.5 px-1">{msg.senderName}</span>
                )}

                <div className="relative">
                  {/* Text message */}
                  {msg.type === "text" && (
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed cursor-default
                        ${isOwn
                          ? "bg-brand-600 text-white rounded-tr-sm"
                          : "bg-surface-800 text-slate-200 rounded-tl-sm"}`}
                    >
                      {msg.message}
                    </div>
                  )}

                  {/* Image message */}
                  {msg.type === "image" && (
                    <a
                      href={`${baseUrl}${msg.file.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={`${baseUrl}${msg.file.url}`}
                        alt={msg.file.originalName}
                        className="max-w-full rounded-xl max-h-48 object-cover border border-surface-700"
                      />
                    </a>
                  )}

                  {/* PDF / generic file message */}
                  {(msg.type === "pdf" || msg.type === "file") && (
                    <a
                      href={`${baseUrl}${msg.file.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 bg-surface-800 border border-surface-700 rounded-xl hover:bg-surface-700 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-red-400" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate max-w-[140px]">{msg.file.originalName}</p>
                        <p className="text-xs text-slate-500">{formatBytes(msg.file.size)}</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-400 flex-shrink-0" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                    </a>
                  )}

                  {/* Reaction picker trigger */}
                  <button
                    onClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                    className={`absolute ${isOwn ? "-left-6" : "-right-6"} top-1 opacity-0 group-hover:opacity-100 transition-opacity
                      w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                    </svg>
                  </button>

                  {/* Reaction picker popover */}
                  {reactingTo === msg.id && (
                    <div
                      className={`absolute bottom-full mb-1 ${isOwn ? "right-0" : "left-0"}
                        flex gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1.5 shadow-glass z-10`}
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onReact(msg.id, emoji);
                            setReactingTo(null);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-700 text-base transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reaction display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span
                        key={emoji}
                        className="text-xs bg-surface-800 border border-surface-700 rounded-full px-1.5 py-0.5 leading-none"
                      >
                        {emoji} {users.length}
                      </span>
                    ))}
                  </div>
                )}

                <span className="text-xs text-slate-600 mt-0.5 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-surface-800 flex-shrink-0">
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 px-1">
            <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Uploading file...
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 items-end">
          {/* File attach button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Attach image or PDF"
            className="w-9 h-9 flex items-center justify-center bg-surface-800 hover:bg-surface-700 border border-surface-700 text-slate-400 hover:text-slate-200 rounded-xl transition-colors flex-shrink-0 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Text input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            maxLength={1000}
            rows={1}
            className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 text-slate-100 placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            style={{ minHeight: "36px", maxHeight: "96px" }}
          />

          <button
            type="submit"
            disabled={!input.trim() || uploading}
            className="w-9 h-9 flex items-center justify-center bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-xl transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
