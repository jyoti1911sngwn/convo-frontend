import React, { useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

const ChatBoard = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [recipients, setRecipients] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState(null);

  const [yourImage, setYourImage] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageToUpload, setImageToUpload] = useState(null);

  const [showMobileUserList, setShowMobileUserList] = useState(false);
  const [largeProfileImg, setLargeProfileImg] = useState(null); // for enlarged view

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const senderId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || "User";
  const userDescription = localStorage.getItem("description") || "";

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
      const res = await fetch("https://convo-backend-6nfw.onrender.com/api/users/getAllUser");
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
        `https://convo-backend-6nfw.onrender.com/api/messages/getMessages/${senderId}/${selectedRecipientId}`
      );
      if (!res.ok) throw new Error("Messages fetch failed");
      const data = await res.json();
      setMessages(
        data.map((msg) => ({
          id: msg.id,
          text: msg.message,
          sender: msg.sender_id === senderId ? "me" : "other",
        }))
      );
    } catch (err) {
      console.error("Messages fetch error:", err);
    }
  }, [senderId, selectedRecipientId]);

  const fetchMyProfileImage = useCallback(async () => {
    if (!senderId) return;
    try {
      const res = await fetch(`https://convo-backend-6nfw.onrender.com/api/images/getImage/${senderId}`);
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
    }, 400);
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

  // Real-time messages
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onReceive = (msg) => {
      if (msg.senderId === selectedRecipientId || msg.recipientId === selectedRecipientId) {
        setMessages((prev) => [
          ...prev,
          {
            id: msg.id || Date.now(),
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
    if (!text || !selectedRecipientId || selectedRecipientId === senderId) return;

    const payload = {
      senderId,
      recipientId: selectedRecipientId,   // ← FIXED: removed typo 'reciepientId'
      messageText: text,
    };

    // Optimistic UI
    setMessages((prev) => [...prev, { id: Date.now(), text, sender: "me" }]);
    setInput("");

    socketRef.current?.emit("sendMessage", payload);

    try {
      const res = await fetch("https://convo-backend-6nfw.onrender.com/api/messages/createMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Message save failed:", errData);
      }
    } catch (err) {
      console.error("Network error saving message:", err);
    }
  };

  const handleUpload = async () => {
    if (!imageToUpload || !senderId) return;

    const formData = new FormData();
    formData.append("image", imageToUpload);
    formData.append("userId", senderId);

    try {
      const res = await fetch("https://convo-backend-6nfw.onrender.com/api/images/uploadImage", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      setShowImageUpload(false);
      setImageToUpload(null);
      await fetchMyProfileImage();
      alert("Profile picture updated!");
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const selectUser = (id) => {
    setSelectedRecipientId(id);
    setShowMobileUserList(false);
  };

  // ─── Derived ──────────────────────────────────────────────────
  const filteredRecipients = recipients.filter((u) =>
    u.username.toLowerCase().includes(debouncedSearch)
  );

  const activeUser = recipients.find((u) => u.id === selectedRecipientId);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-black flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-950 border-b border-green-900/40 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setShowMobileUserList(true)}
          className="text-green-400 text-2xl"
          aria-label="Open contacts"
        >
          ☰
        </button>

        <div className="flex-1 flex items-center justify-center gap-3">
          {activeUser ? (
            <>
              <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-green-600/50">
                {activeUser.image ? (
                  <img src={activeUser.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-green-700 flex items-center justify-center text-black font-bold">
                    {activeUser.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-green-300 font-semibold truncate max-w-[160px]">
                {activeUser.username}
              </h2>
            </>
          ) : (
            <h2 className="text-gray-400 font-medium">CONVO</h2>
          )}
        </div>

        <div
          onClick={() => setShowImageUpload(true)}
          className="h-9 w-9 rounded-full overflow-hidden border-2 border-green-600/50 cursor-pointer"
        >
          {yourImage ? (
            <img src={yourImage} alt="You" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-green-700 flex items-center justify-center text-black font-bold text-sm">
              {userName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar / Drawer */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40 w-80 bg-gray-950 border-r border-green-900/30
          transform transition-transform duration-300 md:translate-x-0
          ${showMobileUserList ? "translate-x-0" : "-translate-x-full"}
          flex flex-col
        `}
      >
        <div className="md:hidden p-4 border-b border-green-900/30 flex justify-between items-center">
          <h1 className="text-green-400 text-2xl font-bold">CONVO</h1>
          <button onClick={() => setShowMobileUserList(false)} className="text-3xl text-gray-300">
            ×
          </button>
        </div>

        <div className="p-4 border-b border-green-900/30">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full px-4 py-2.5 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRecipients.map((user) => (
            <div
              key={user.id}
              onClick={() => selectUser(user.id)}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-800/70 ${selectedRecipientId === user.id ? "bg-gray-800/50" : ""}`}
            >
              <div
                className="h-12 w-12 rounded-full overflow-hidden border-2 border-green-600/40 flex-shrink-0 bg-green-700 cursor-zoom-in"
                onClick={(e) => {
                  e.stopPropagation();
                  if (user.image) setLargeProfileImg(user.image);
                }}
              >
                {user.image ? (
                  <img src={user.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-black font-bold">
                    {user.username?.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.username}</p>
                <p className="text-xs text-gray-400 truncate">
                  {user.message ? (user.message.length > 38 ? user.message.slice(0, 38) + "..." : user.message) : "Start chatting"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="md:hidden p-4 border-t border-green-900/30 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600/90 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {showMobileUserList && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setShowMobileUserList(false)} />
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <header className="hidden md:flex items-center gap-3 px-5 py-3.5 bg-gray-950/90 border-b border-green-900/30">
          <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-green-600/50">
            {activeUser?.image ? (
              <img src={activeUser.image} alt="" className="h-full w-full object-cover" />
            ) : activeUser ? (
              <div className="h-full w-full bg-green-700 flex items-center justify-center text-black font-bold">
                {activeUser.username?.[0]?.toUpperCase()}
              </div>
            ) : null}
          </div>
          <div>
            <h2 className="text-green-300 font-semibold">{activeUser?.username || "Select someone to chat"}</h2>
            {activeUser && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                Online
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-5 overflow-y-auto bg-gradient-to-b from-black via-gray-950 to-black">
          {messages.length === 0 && selectedRecipientId && (
            <div className="h-full flex items-center justify-center text-gray-500 text-center">
              No messages yet.<br />Say hello! 👋
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex mb-4 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
              <div
                className={`
                  max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm md:text-base shadow-sm
                  ${msg.sender === "me" ? "bg-green-600 text-black rounded-br-none" : "bg-gray-800 text-white rounded-bl-none"}
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </main>

        <footer className="p-4 bg-gray-950 border-t border-green-900/30 flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Type a message..."
            className="flex-1 px-5 py-3 rounded-full bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm md:text-base"
          />
          {selectedRecipientId && selectedRecipientId !== senderId && (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-black font-bold flex items-center justify-center transition-colors"
            >
              ➤
            </button>
          )}
        </footer>
      </div>

      {/* Desktop Profile Sidebar */}
      <aside className="hidden lg:flex w-80 bg-gray-950 border-l border-green-900/30 flex-col items-center py-10 px-4">
        <div
          onClick={() => setShowImageUpload(true)}
          className="h-48 w-48 lg:h-56 lg:w-56 rounded-full bg-gradient-to-br from-green-600 to-green-800 cursor-pointer overflow-hidden border-4 border-green-500/40 shadow-2xl flex items-center justify-center text-5xl font-bold text-black"
        >
          {yourImage ? (
            <img src={yourImage} alt="You" className="h-full w-full object-cover" onError={() => setYourImage("")} />
          ) : (
            <span>{userName?.[0]?.toUpperCase() || "?"}</span>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">Welcome back</p>
          <h1 className="text-green-400 text-2xl lg:text-3xl font-bold mt-1.5">{userName}</h1>
          {userDescription && <p className="text-gray-400 text-sm mt-3 italic">~ {userDescription}</p>}
        </div>

        <div className="mt-auto w-full max-w-xs">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600/90 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl p-6 md:p-8 w-full max-w-md border border-green-900/30 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-green-400 text-xl font-semibold">Change Profile Picture</h2>
              <button onClick={() => { setShowImageUpload(false); setImageToUpload(null); }} className="text-3xl text-gray-400 hover:text-white">
                ×
              </button>
            </div>

            {imageToUpload && (
              <div className="mb-6 rounded-xl overflow-hidden border border-green-800/40">
                <img src={URL.createObjectURL(imageToUpload)} alt="Preview" className="w-full h-56 object-cover" />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageToUpload(e.target.files?.[0] ?? null)}
              className="block w-full text-white file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-black hover:file:bg-green-700 cursor-pointer"
            />

            <button
              onClick={handleUpload}
              disabled={!imageToUpload}
              className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:text-gray-400 text-black font-semibold rounded-lg transition-colors"
            >
              Upload Picture
            </button>
          </div>
        </div>
      )}

      {/* Large Profile Picture Modal */}
      {largeProfileImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setLargeProfileImg(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            <button
              className="absolute -top-12 right-2 text-white text-5xl hover:text-green-400 transition-colors"
              onClick={() => setLargeProfileImg(null)}
            >
              ×
            </button>
            <img
              src={largeProfileImg}
              alt="User profile"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-green-800/40"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBoard;