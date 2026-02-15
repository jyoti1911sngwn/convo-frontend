import React, { useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import AnimateBackground from "./AnimateBackground";

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
  const [uploadStatus, setUploadStatus] = useState("");

  const [showMobileUserList, setShowMobileUserList] = useState(true);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const inputContainerRef = useRef(null);

  const senderId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || "User";

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ─── Socket Connection ────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io("https://convo-backend-6nfw.onrender.com");
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (senderId) socketRef.current?.emit("join", senderId);
  }, [senderId]);

  // ─── Fetch Functions ──────────────────────────────────────────
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

  // ─── Image Upload Handler ─────────────────────────────────────
  const handleUpload = async () => {
    if (!imageToUpload || !senderId) return;

    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("image", imageToUpload);
    formData.append("userId", senderId);

    try {
      const res = await fetch(
        "https://convo-backend-6nfw.onrender.com/api/images/uploadImage",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await res.json();
      console.log("Upload success:", result);

      await fetchMyProfileImage();

      setUploadStatus("Profile picture updated successfully!");
      setTimeout(() => {
        setShowImageUpload(false);
        setImageToUpload(null);
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus("Upload failed: " + (err.message || "Unknown error"));
    }
  };

  // ─── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (senderId) {
      fetchAllUsers();
      fetchMyProfileImage();
    }
  }, [senderId, fetchAllUsers, fetchMyProfileImage]);

  useEffect(() => {
    if (selectedRecipientId) fetchMessages();
  }, [selectedRecipientId, fetchMessages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Auto-select first user on desktop
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipientId && !isMobile) {
      setSelectedRecipientId(recipients[0].id);
      setShowMobileUserList(false);
    }
  }, [recipients, selectedRecipientId, isMobile]);

  // Real-time messages
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onReceive = (msg) => {
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

    socket.on("receiveMessage", onReceive);
    return () => socket.off("receiveMessage", onReceive);
  }, [selectedRecipientId, senderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Improved mobile keyboard handling
// Only this useEffect remains for keyboard handling
useEffect(() => {
  if (!isMobile) return;

  const update = () => {
    if (!window.visualViewport) return;

    const vh = window.visualViewport.height;
    const full = window.innerHeight;

    if (full - vh > 100) {
      const container = inputContainerRef.current;
      if (container) {
        container.style.position = 'fixed';
        container.style.bottom = '0px';
      }

      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 120);
    }
  };

  window.visualViewport.addEventListener("resize", update);
  window.visualViewport.addEventListener("scroll", update);
  window.addEventListener("resize", update);

  const onFocus = () => setTimeout(update, 80);
  const inputEl = inputRef.current;
  if (inputEl) inputEl.addEventListener("focus", onFocus);

  // Initial call
  update();

  return () => {
    window.visualViewport.removeEventListener("resize", update);
    window.visualViewport.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    if (inputEl) inputEl.removeEventListener("focus", onFocus);
  };
}, [isMobile]);

  // ─── Handlers ─────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedRecipientId || selectedRecipientId === senderId)
      return;

    const tempId = Date.now();
    setMessages((prev) => [...prev, { id: tempId, text, sender: "me" }]);
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
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      const saved = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m)),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const selectUser = (id) => {
    setSelectedRecipientId(id);
    if (isMobile) setShowMobileUserList(false);
  };

  // ─── Filtered & Active ────────────────────────────────────────
  const filteredRecipients = recipients.filter((u) =>
    u.username.toLowerCase().includes(debouncedSearch),
  );

  const activeUser = recipients.find((u) => u.id === selectedRecipientId);

  // ...existing code...
useEffect(() => {
  if (!isMobile) return;

  const update = () => {
    if (!window.visualViewport) return;

    const vh = window.visualViewport.height;
    const full = window.innerHeight;

    // Only apply when keyboard is probably visible
    if (full - vh > 100) {           // threshold ~ keyboard height
      // Use the **visible** height instead of adding padding
      const container = inputContainerRef.current;
      if (container) {
        container.style.position = 'fixed';
        container.style.bottom = '0px';
        // Optional: force it to respect visual viewport
        // Some people also do: container.style.height = `${vh}px`; but usually not needed
      }

      // Scroll message area or input into view
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 120);
    }
  };

  window.visualViewport.addEventListener("resize", update);
  window.visualViewport.addEventListener("scroll", update);
  window.addEventListener("resize", update);

  // Focus events can help too
  const onFocus = () => setTimeout(update, 80);

  // Capture the current input element so cleanup removes listener from the same node
  const inputEl = inputRef.current;
  if (inputEl?.addEventListener) inputEl.addEventListener("focus", onFocus);

  return () => {
    window.visualViewport.removeEventListener("resize", update);
    window.visualViewport.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    if (inputEl?.removeEventListener) inputEl.removeEventListener("focus", onFocus);
  };
}, [isMobile]);
// ...existing code...

  // ─── Render Helpers ───────────────────────────────────────────
  const renderMessageInput = () => {
    if (!selectedRecipientId || selectedRecipientId === senderId) return null;

    return (
      <div
        ref={inputContainerRef}
        className={`
          bg-gray-950 border-t border-green-900/60 px-4 py-4
          ${isMobile ? "fixed left-0 right-0 z-20" : "relative"}
        `}
        style={
          isMobile
            ? {
                bottom: 0,
                // paddingBottom: `${Math.max(keyboardHeight + 8, 16)}px`,
                transition: "padding-bottom 0.25s ease-out",
              }
            : {}
        }
      >
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
            className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold flex items-center justify-center transition-colors shadow-md"
          >
            ➤
          </button>
        </div>
      </div>
    );
  };

  const renderImageUploadModal = () => {
    if (!showImageUpload) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
        <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-green-900/50 shadow-2xl">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-green-400 text-xl font-semibold">
              Change Profile Picture
            </h2>
            <button
              onClick={() => {
                setShowImageUpload(false);
                setImageToUpload(null);
                setUploadStatus("");
              }}
              className="text-3xl text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          {imageToUpload && (
            <div className="mb-6 rounded-xl overflow-hidden border border-green-800/60 shadow-inner">
              <img
                src={URL.createObjectURL(imageToUpload)}
                alt="Preview"
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          <label className="block cursor-pointer">
            <span className="sr-only">Choose file</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageToUpload(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-white
                file:mr-4 file:py-3 file:px-6 file:rounded-xl
                file:border-0 file:text-sm file:font-medium
                file:bg-green-700 file:text-white
                hover:file:bg-green-800 file:cursor-pointer
                file:transition-colors"
            />
          </label>

          <button
            onClick={handleUpload}
            disabled={!imageToUpload || uploadStatus.includes("Uploading")}
            className={`mt-6 w-full py-3.5 rounded-xl font-semibold transition-all ${
              uploadStatus.includes("success")
                ? "bg-green-700 text-white"
                : uploadStatus.includes("failed")
                  ? "bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-black shadow-md"
            }`}
          >
            {uploadStatus || "Upload Picture"}
          </button>

          {uploadStatus && (
            <p
              className={`mt-3 text-center text-sm font-medium ${
                uploadStatus.includes("success")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {uploadStatus}
            </p>
          )}
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────
  return (
    <div className="h-dvh w-screen bg-black flex flex-col overflow-hidden">
      {/* Mobile header */}
      <div className="md:hidden bg-gray-950 border-b border-green-900/60 px-4 py-3 flex items-center justify-between z-20">
        <button
          onClick={() => setShowMobileUserList(true)}
          className="text-green-400 text-2xl"
        >
          ☰
        </button>

        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          {activeUser ? (
            <>
              <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-green-600/60">
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
              <h2 className="text-green-200 font-semibold truncate">
                {activeUser.username}
              </h2>
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
            <img
              src={yourImage}
              alt="You"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-green-800 flex items-center justify-center text-white font-bold">
              {userName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
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
                  selectedRecipientId === user.id
                    ? "bg-green-900/20"
                    : "hover:bg-gray-800/70"
                }`}
              >
                <div
                  className="h-12 w-12 rounded-full overflow-hidden border-2 border-green-700/60 flex-shrink-0 cursor-zoom-in"
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
                    <div className="h-full w-full bg-green-800 flex items-center justify-center text-white font-bold text-lg">
                      {user.username?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {user.message || "Start chatting"}
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

        {showMobileUserList && isMobile && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setShowMobileUserList(false)}
          />
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <header className="hidden md:flex items-center gap-4 px-6 py-4 bg-gray-950 border-b border-green-900/50">
            {activeUser && (
              <>
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-green-600/60">
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
            )}
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-y-auto relative bg-transparent">
            <div className="absolute inset-0 pointer-events-none z-0">
              <AnimateBackground />
            </div>
            <div className="relative z-10 min-h-full flex flex-col">
              {!selectedRecipientId ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center">
                  <div className="text-6xl mb-6">💬</div>
                  <h3 className="text-xl text-gray-300 mb-3">
                    Welcome to CONVO
                  </h3>
                  <p>Select a user to start chatting</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No messages yet. Say hello! 👋
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
                      ${msg.sender === "me" ? "bg-green-600 text-black rounded-br-none" : "bg-gray-800 text-white rounded-bl-none"}
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
            </div>
            <div ref={messagesEndRef} />
          </main>

          {renderMessageInput()}
        </div>
      </div>

      {renderImageUploadModal()}

      {/* Large profile view */}
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
              alt="Profile"
              className="w-full max-h-[85vh] object-contain rounded-2xl border border-green-800/40 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBoard;
