import React, { useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

const ChatBoard = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDelivered, setIsDelivered] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState(null);

  const [yourImage, setYourImage] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageToUpload, setImageToUpload] = useState(null);
  const [largeProfileImg, setLargeProfileImg] = useState(null);

  const [showMobileUserList, setShowMobileUserList] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const senderId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || "User";
  const userDescription = localStorage.getItem("description") || "";

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ─── Socket Connection ────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io("https://convo-backend-6nfw.onrender.com");
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (senderId) socketRef.current?.emit("join", senderId);
  }, [senderId]);

  // ─── Data Fetching ────────────────────────────────────────────
  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("https://convo-backend-6nfw.onrender.com/api/users/getAllUser");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setRecipients(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedRecipientId || !senderId) return;
    try {
      const res = await fetch(
        `https://convo-backend-6nfw.onrender.com/api/messages/getMessages/${senderId}/${selectedRecipientId}`
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(
        data.map((msg) => ({
          id: msg.id,
          text: msg.message,
          sender: msg.sender_id === senderId ? "me" : "other",
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }, [senderId, selectedRecipientId]);

  const fetchMyProfileImage = useCallback(async () => {
    if (!senderId) return;
    try {
      const res = await fetch(`https://convo-backend-6nfw.onrender.com/api/images/getImage/${senderId}`);
      if (res.status === 404 || !res.ok) {
        setYourImage("");
        return;
      }
      const { imageUrl } = await res.json();
      setYourImage(imageUrl || "");
    } catch {
      setYourImage("");
    }
  }, [senderId]);

  // ─── Auto-fetch on mount / change ─────────────────────────────
  useEffect(() => {
    if (senderId) {
      fetchAllUsers();
      fetchMyProfileImage();
    }
  }, [senderId, fetchAllUsers, fetchMyProfileImage]);

  useEffect(() => {
    if (selectedRecipientId) fetchMessages();
  }, [selectedRecipientId, fetchMessages]);

  // Auto-select first user on desktop
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipientId && !isMobile) {
      setSelectedRecipientId(recipients[0].id);
      setShowMobileUserList(false);
    }
  }, [recipients, selectedRecipientId, isMobile]);

  // ─── Real-time messages ───────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleReceive = (msg) => {
      if (msg.senderId === senderId) setIsDelivered(true);

      if (
        msg.senderId === selectedRecipientId ||
        msg.recipientId === selectedRecipientId
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: msg.id,
            text: msg.messageText,
            sender: msg.senderId === senderId ? "me" : "other",
          },
        ]);
      }
    };

    socket.on("receiveMessage", handleReceive);
    return () => socket.off("receiveMessage", handleReceive);
  }, [selectedRecipientId, senderId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Debounced search ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── Keyboard height detection (mobile) ───────────────────────
  useEffect(() => {
    if (!isMobile) return;

    const updateKeyboardHeight = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      const dh = window.innerHeight;
      setKeyboardHeight(dh - vh);
    };

    window.visualViewport?.addEventListener("resize", updateKeyboardHeight);
    window.addEventListener("resize", updateKeyboardHeight);

    // Initial check
    updateKeyboardHeight();

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardHeight);
      window.removeEventListener("resize", updateKeyboardHeight);
    };
  }, [isMobile]);

  // ─── Send message with optimistic update ──────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedRecipientId || selectedRecipientId === senderId) return;

    const tempId = Date.now();
    const optimisticMsg = { id: tempId, text, sender: "me" };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");

    const payload = {
      senderId,
      recipientId: selectedRecipientId,
      messageText: text,
    };

    socketRef.current?.emit("sendMessage", payload);

    try {
      const res = await fetch(
        "https://convo-backend-6nfw.onrender.com/api/messages/createMessage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      const saved = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m))
      );
    } catch (err) {
      console.error("Send failed:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const selectUser = (userId) => {
    setSelectedRecipientId(userId);
    if (isMobile) setShowMobileUserList(false);
  };

  const filteredRecipients = recipients.filter((u) =>
    u.username.toLowerCase().includes(debouncedSearch)
  );

  const activeUser = recipients.find((u) => u.id === selectedRecipientId);

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────

  return (
    <div className="h-dvh w-screen bg-black flex flex-col overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-gray-950 border-b border-green-900/60 px-4 py-3 flex items-center justify-between z-20">
        <button
          onClick={() => setShowMobileUserList(true)}
          className="text-green-400 text-2xl"
          aria-label="Open contacts"
        >
          ☰
        </button>

        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          {activeUser ? (
            <>
              <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-green-600/60 flex-shrink-0">
                {activeUser.image ? (
                  <img src={activeUser.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-green-800 flex items-center justify-center text-white font-bold">
                    {activeUser.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-green-200 font-semibold truncate">{activeUser.username}</h2>
            </>
          ) : (
            <h2 className="text-gray-400 font-medium">CONVO</h2>
          )}
        </div>

        <div
          className="h-9 w-9 rounded-full overflow-hidden border-2 border-green-600/60 cursor-pointer"
          onClick={() => setShowImageUpload(true)}
        >
          {yourImage ? (
            <img src={yourImage} alt="Your profile" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-green-800 flex items-center justify-center text-white font-bold">
              {userName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar / User List */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40 w-80 bg-gray-950 border-r border-green-900/50
            transform transition-transform duration-300 md:translate-x-0
            ${showMobileUserList ? "translate-x-0" : "-translate-x-full"}
            flex flex-col
          `}
        >
          <div className="md:hidden p-4 border-b border-green-900/50 flex justify-between items-center">
            <h1 className="text-green-400 text-2xl font-bold">CONVO</h1>
            <button
              onClick={() => setShowMobileUserList(false)}
              className="text-3xl text-gray-300 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="p-4 border-b border-green-900/50">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredRecipients.map((user) => (
              <div
                key={user.id}
                onClick={() => selectUser(user.id)}
                className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                  selectedRecipientId === user.id ? "bg-green-900/20" : "hover:bg-gray-800/70"
                }`}
              >
                <div
                  className="h-12 w-12 rounded-full overflow-hidden border-2 border-green-700/60 flex-shrink-0 cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    user.image && setLargeProfileImg(user.image);
                  }}
                >
                  {user.image ? (
                    <img src={user.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-green-800 flex items-center justify-center text-white font-bold text-lg">
                      {user.username?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.username}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {user.message || "Tap to start chatting"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="md:hidden p-4 border-t border-green-900/50">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }}
              className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl font-medium"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {showMobileUserList && isMobile && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setShowMobileUserList(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Desktop header */}
          <header className="hidden md:flex items-center gap-4 px-6 py-4 bg-gray-950 border-b border-green-900/50">
            {activeUser && (
              <>
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-green-600/60">
                  {activeUser.image ? (
                    <img src={activeUser.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-green-800 flex items-center justify-center text-white font-bold">
                      {activeUser.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-green-200 font-semibold">{activeUser.username}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    Online
                  </div>
                </div>
              </>
            )}
          </header>

          {/* Messages */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-gradient-to-b from-black to-gray-950">
            {!selectedRecipientId ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <div className="text-6xl mb-6 opacity-70">💬</div>
                <h3 className="text-xl text-gray-300 mb-3">Welcome to Convo</h3>
                <p>Select someone to start chatting</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-center">
                No messages yet.<br />Say hello! 👋
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex mb-5 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm
                      ${msg.sender === "me"
                        ? "bg-green-600 text-black rounded-br-none"
                        : "bg-gray-800 text-white rounded-bl-none"}
                    `}
                  >
                    {msg.text}
                    {msg.sender === "me" && isDelivered && (
                      <span className="text-xs text-gray-300/80 ml-2">✓</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </main>

          {/* Message Input */}
          <div
            className={`
              bg-gray-950 border-t border-green-900/60 px-4 py-4 transition-all duration-300
              ${isMobile ? "fixed bottom-0 left-0 right-0 z-20" : ""}
            `}
            style={isMobile ? { paddingBottom: `${keyboardHeight + 16}px` } : {}}
          >
            {selectedRecipientId && selectedRecipientId !== senderId && (
              <div className="flex items-center gap-3 max-w-5xl mx-auto">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-5 py-3.5 rounded-full bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 text-base"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-black font-bold flex items-center justify-center transition-colors"
                >
                  ➤
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      {showImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-green-900/40">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-green-400 text-xl font-semibold">Change Profile Picture</h2>
              <button
                onClick={() => {
                  setShowImageUpload(false);
                  setImageToUpload(null);
                }}
                className="text-3xl text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {imageToUpload && (
              <div className="mb-6 rounded-xl overflow-hidden border border-green-800/50">
                <img
                  src={URL.createObjectURL(imageToUpload)}
                  alt="Preview"
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageToUpload(e.target.files?.[0] ?? null)}
              className="block w-full text-white file:bg-green-700 file:text-white file:py-3 file:px-6 file:rounded-xl file:border-0 cursor-pointer"
            />

            <button
              onClick={() => {
                // ← your upload logic here
                // handleUpload()
              }}
              disabled={!imageToUpload}
              className="mt-6 w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-black font-semibold rounded-xl"
            >
              Upload
            </button>
          </div>
        </div>
      )}

      {largeProfileImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLargeProfileImg(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              className="absolute -top-12 right-4 text-white text-6xl hover:text-green-400"
              onClick={() => setLargeProfileImg(null)}
            >
              ×
            </button>
            <img
              src={largeProfileImg}
              alt="Enlarged profile"
              className="w-full max-h-[85vh] object-contain rounded-2xl border border-green-800/40"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBoard;