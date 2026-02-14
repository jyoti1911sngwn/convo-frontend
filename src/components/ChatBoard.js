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

  const [showMobileUserList, setShowMobileUserList] = useState(true); // default true on mobile
  const [largeProfileImg, setLargeProfileImg] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const senderId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || "User";
  // const userDescription = localStorage.getItem("description") || "";

  // ─── Socket ───────────────────────────────────────────────────
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
      const res = await fetch(
        "https://convo-backend-6nfw.onrender.com/api/users/getAllUser",
      );
      if (!res.ok) throw new Error("Failed to load users");
      setRecipients((await res.json()) || []);
    } catch (err) {
      console.error("Users fetch error:", err);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedRecipientId || !senderId) return;
    try {
      const res = await fetch(
        `https://convo-backend-6nfw.onrender.com/api/messages/getMessages/${senderId}/${selectedRecipientId}`,
      );
      if (!res.ok) throw new Error("Messages fetch failed");
      const data = await res.json();
      setMessages(
        data.map((msg) => ({
          id: msg.id,
          text: msg.message,
          sender: msg.sender_id === senderId ? "me" : "other",
        })),
      );
    } catch (err) {
      console.error("Messages fetch error:", err);
    }
  }, [senderId, selectedRecipientId]);

  const fetchMyProfileImage = useCallback(async () => {
    if (!senderId) return;
    try {
      const res = await fetch(
        `https://convo-backend-6nfw.onrender.com/api/images/getImage/${senderId}`,
      );
      if (res.status === 404 || !res.ok) return setYourImage("");
      const { imageUrl } = await res.json();
      setYourImage(imageUrl || "");
    } catch {
      setYourImage("");
    }
  }, [senderId]);

  // ─── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (senderId) {
      fetchAllUsers();
      fetchMyProfileImage();
    }
  }, [senderId, fetchAllUsers, fetchMyProfileImage]);

  useEffect(() => {
    if (selectedRecipientId) fetchMessages();
  }, [selectedRecipientId, fetchMessages]);

  // Auto-select first user on desktop/large screens when list loads
  useEffect(() => {
    if (
      recipients.length > 0 &&
      !selectedRecipientId &&
      window.innerWidth >= 768
    ) {
      setSelectedRecipientId(recipients[0].id);
      setShowMobileUserList(false);
    }
  }, [recipients, selectedRecipientId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onReceive = (msg) => {
      if (msg.senderId === senderId) {
        setIsDelivered(true);
        return;
      }

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

    socket.on("receiveMessage", onReceive);
    return () => socket.off("receiveMessage", onReceive);
  }, [selectedRecipientId, senderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Handlers ─────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedRecipientId || selectedRecipientId === senderId)
      return;

    const optimisticId = Date.now();
    const optimisticMsg = { id: optimisticId, text, sender: "me" };

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
        },
      );

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return;
      }

      const saved = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, id: saved.id } : m)),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  const selectUser = (id) => {
    setSelectedRecipientId(id);
    if (window.innerWidth < 768) {
      setShowMobileUserList(false);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────
  const filteredRecipients = recipients.filter((u) =>
    u.username.toLowerCase().includes(debouncedSearch),
  );

  const activeUser = recipients.find((u) => u.id === selectedRecipientId);

  const isMobile = window.innerWidth < 768;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="h-dvh w-screen bg-black flex flex-col overflow-hidden">
      {/* ─── MOBILE HEADER ──────────────────────────────────────── */}
      <div className="md:hidden bg-gray-950 border-b border-green-900/50 px-4 py-3 flex items-center justify-between z-20 relative">
        <button
          onClick={() => setShowMobileUserList(true)}
          className="text-green-400 text-2xl"
          aria-label="Show contacts"
        >
          ☰
        </button>

        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          {activeUser ? (
            <>
              <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-green-600/60 flex-shrink-0">
                {activeUser.image ? (
                  <img
                    src={activeUser.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-green-800/80 flex items-center justify-center text-white font-bold text-lg">
                    {activeUser.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-green-200 font-semibold truncate">
                {activeUser.username}
              </h2>
            </>
          ) : (
            <h2 className="text-gray-400 font-medium">CONVO</h2>
          )}
        </div>

        <div
          onClick={() => setShowImageUpload(true)}
          className="h-9 w-9 rounded-full overflow-hidden border-2 border-green-600/60 cursor-pointer flex-shrink-0"
        >
          {yourImage ? (
            <img
              src={yourImage}
              alt="You"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-green-800/80 flex items-center justify-center text-white font-bold text-lg">
              {userName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      {/* ─── SIDEBAR (Drawer on mobile) ──────────────────────────── */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40 w-80 sm:w-96 bg-gray-950 border-r border-green-900/40
          transform transition-transform duration-300 ease-in-out
          ${showMobileUserList ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 flex flex-col
        `}
      >
        {/* Mobile header inside drawer */}
        <div className="md:hidden p-4 border-b border-green-900/50 flex justify-between items-center">
          <h1 className="text-green-400 text-2xl font-bold tracking-tight">
            CONVO
          </h1>
          <button
            onClick={() => setShowMobileUserList(false)}
            className="text-3xl text-gray-300 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b border-green-900/40">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full px-4 py-3 rounded-xl bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600/70 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/50">
          {filteredRecipients.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No users found
            </div>
          ) : (
            filteredRecipients.map((user) => (
              <div
                key={user.id}
                onClick={() => selectUser(user.id)}
                className={`flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors
                  ${selectedRecipientId === user.id ? "bg-green-900/20" : "hover:bg-gray-800/60"}`}
              >
                <div
                  className="h-12 w-12 rounded-full overflow-hidden border-2 border-green-700/50 flex-shrink-0 cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (user.image) setLargeProfileImg(user.image);
                  }}
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-green-800/70 flex items-center justify-center text-white font-bold text-lg">
                      {user.username?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {user.message || "Start a conversation"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="md:hidden p-4 border-t border-green-900/40">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            className="w-full py-3.5 bg-red-700/90 hover:bg-red-800 text-white rounded-xl font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay when mobile sidebar is open */}
      {showMobileUserList && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setShowMobileUserList(false)}
        />
      )}

      {/* ─── MAIN CHAT AREA ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Desktop header */}
        <header className="hidden md:flex items-center gap-4 px-6 py-4 bg-gray-950/90 border-b border-green-900/50">
          {activeUser ? (
            <>
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-green-600/60 flex-shrink-0">
                {activeUser.image ? (
                  <img
                    src={activeUser.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-green-800 flex items-center justify-center text-white font-bold">
                    {activeUser.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-green-200 font-semibold">
                  {activeUser.username}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Online
                </div>
              </div>
            </>
          ) : (
            <h2 className="text-gray-400 font-medium">Select a conversation</h2>
          )}
        </header>

        {/* Chat messages */}
        <main
          ref={chatContainerRef}
          className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto bg-gradient-to-b from-black via-gray-950 to-black scrollbar-thin scrollbar-thumb-green-900/40"
        >
          {!selectedRecipientId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center px-6">
              <div className="text-6xl mb-6">💬</div>
              <h3 className="text-xl font-medium text-gray-300 mb-3">
                Welcome to CONVO
              </h3>
              <p className="max-w-md">
                Select a user from the list to start chatting
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-center">
              No messages yet.
              <br />
              Say hello! 👋
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex mb-4 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                    max-w-[82%] sm:max-w-[75%] md:max-w-[68%] lg:max-w-[60%]
                    px-4 py-2.5 rounded-2xl text-[15px] sm:text-base leading-relaxed shadow-sm
                    ${
                      msg.sender === "me"
                        ? "bg-green-600 text-black rounded-br-none"
                        : "bg-gray-800 text-white rounded-bl-none"
                    }
                  `}
                >
                  {msg.text}
                  {msg.sender === "me" && isDelivered && (
                    <span className="text-xs text-gray-300/80 ml-2 align-bottom">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input area */}
        {selectedRecipientId && selectedRecipientId !== senderId && (
          <footer className="p-4 bg-gray-950 border-t border-green-900/50">
            <div className="flex items-center gap-3 max-w-5xl mx-auto">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 px-5 py-3.5 rounded-full bg-gray-800/90 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600/70 text-base"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold flex items-center justify-center transition-colors flex-shrink-0"
              >
                ➤
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* ─── IMAGE UPLOAD MODAL ─────────────────────────────────── */}
      {showImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 w-full max-w-md border border-green-900/40 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-green-400 text-xl font-semibold">
                Update Profile Picture
              </h2>
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
              <div className="mb-6 rounded-xl overflow-hidden border border-green-800/50 shadow-inner">
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
              className="block w-full text-white file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-green-700 file:text-white hover:file:bg-green-800 cursor-pointer"
            />

            <button
              onClick={() => {
                /* upload logic here */
              }}
              disabled={!imageToUpload}
              className="mt-6 w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-green-900/50 disabled:text-gray-400 text-black font-semibold rounded-xl transition-colors"
            >
              Upload Picture
            </button>
          </div>
        </div>
      )}

      {/* Large profile view */}
      {largeProfileImg && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4"
          onClick={() => setLargeProfileImg(null)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              className="absolute -top-14 right-2 text-white text-6xl hover:text-green-400"
              onClick={() => setLargeProfileImg(null)}
            >
              ×
            </button>
            <img
              src={largeProfileImg}
              alt="Profile"
              className="w-full max-h-[88vh] object-contain rounded-2xl border border-green-800/50 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBoard;
