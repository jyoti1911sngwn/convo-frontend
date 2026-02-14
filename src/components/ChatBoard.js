import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";

const ChatBoard = () => {
  const [messages, setMessages] = useState([]);
  const [imageUploadPop, setImageUploadPop] = useState(false);
  const [uploadImage, setUploadImage] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const socketRef = useRef(null);

  const senderId = localStorage.getItem("userId");
  const name = localStorage.getItem("userName") || "User";
  const description = localStorage.getItem("description") || "";
  const [input, setInput] = useState("");
  const [yourImage, setYourImage] = useState("");
  const [recipients, setRecipients] = useState([]); // renamed from recpient → recipients
  const [selectedRecipientId, setSelectedRecipientId] = useState(null);

  const messagesEndRef = useRef(null);

  // Socket connection
  useEffect(() => {
    socketRef.current = io("https://convo-backend-6nfw.onrender.com");

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Join room with userId
  useEffect(() => {
    if (senderId && socketRef.current) {
      socketRef.current.emit("join", senderId);
    }
  }, [senderId]);

  // Load all users
  const loadUsers = async () => {
    try {
      const res = await fetch("https://convo-backend-6nfw.onrender.com/api/users/getAllUser");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setRecipients(data || []);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async () => {
    if (!selectedRecipientId) return;
    try {
      const res = await fetch(
        `https://convo-backend-6nfw.onrender.com/api/messages/getMessages/${senderId}/${selectedRecipientId}`
      );
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      const formatted = data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender_id === senderId ? "me" : "other",
      }));
      setMessages(formatted);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  // Load your own profile picture
  const loadMyProfileImage = async () => {
    if (!senderId) return;
    try {
      const res = await fetch(
        `https://convo-backend-6nfw.onrender.com/api/images/getImage/${senderId}`
      );
      if (res.status === 404 || !res.ok) {
        setYourImage("");
        return;
      }
      const data = await res.json();
      if (data?.imageUrl) {
        setYourImage(data.imageUrl);
      }
    } catch (err) {
      console.error("Failed to load profile image:", err);
      setYourImage("");
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 600); // faster than 2000ms
    return () => clearTimeout(timer);
  }, [search]);

  // Initial data loading
  useEffect(() => {
    loadUsers();
    loadMyProfileImage();
  }, [senderId]);

  // Reload messages when recipient changes
  useEffect(() => {
    if (selectedRecipientId) {
      loadMessages();
    }
  }, [selectedRecipientId]);

  // Socket message listener
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (
        message.senderId === selectedRecipientId ||
        message.reciepientId === selectedRecipientId
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: message.id || Date.now(),
            text: message.messageText,
            sender: message.senderId === senderId ? "me" : "other",
          },
        ]);
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [selectedRecipientId, senderId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedRecipientId || selectedRecipientId === senderId) {
      alert("Please select a valid recipient and type a message.");
      return;
    }

    const payload = {
      senderId,
      reciepientId: selectedRecipientId,
      messageText: input,
    };

    // Optimistic UI update
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: input, sender: "me" },
    ]);

    setInput("");

    // Emit via socket
    socketRef.current?.emit("sendMessage", payload);

    // Save to DB
    try {
      await fetch("https://convo-backend-6nfw.onrender.com/api/messages/createMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const handleUpload = async () => {
    if (!uploadImage || !senderId) return;

    try {
      const formData = new FormData();
      formData.append("image", uploadImage);
      formData.append("userId", senderId);

      const res = await fetch("https://convo-backend-6nfw.onrender.com/api/images/uploadImage", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      setImageUploadPop(false);
      setUploadImage(null);
      await loadMyProfileImage(); // refresh image
      alert("Profile picture updated successfully!");
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Failed to upload image: " + err.message);
    }
  };

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const filteredRecipients = recipients.filter((u) =>
    u.username.toLowerCase().includes(debouncedSearch)
  );

  const selectedUser = recipients.find((u) => u.id === selectedRecipientId);

  return (
    <div className="h-screen w-screen bg-black flex overflow-hidden">
      {/* Sidebar - User list */}
      <aside className="hidden md:flex w-80 bg-gray-950 border-r border-green-900/30 flex-col">
        <div className="p-4 border-b border-green-900/30">
          <h1 className="text-green-400 text-2xl font-bold">CONVO</h1>
          <p className="text-sm text-gray-400 mt-1">Connect with friends 💚</p>
          <input
            placeholder="Search users..."
            className="mt-4 w-full px-4 py-2.5 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {(debouncedSearch ? filteredRecipients : recipients).map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-800/70 cursor-pointer transition-colors ${
                selectedRecipientId === user.id ? "bg-gray-800/50" : ""
              }`}
              onClick={() => setSelectedRecipientId(user.id)}
            >
              <div className="h-11 w-11 rounded-full bg-green-600 flex items-center justify-center font-bold text-black overflow-hidden border-2 border-green-500/40">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.username}
                    className="h-full w-full object-cover"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <span>{user.username?.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.username}</p>
                <p className="text-xs text-gray-400 truncate">
                  {user.message
                    ? user.message.length > 32
                      ? user.message.slice(0, 32) + "..."
                      : user.message
                    : "Tap to start chatting"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <section className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-3.5 bg-gray-950/90 border-b border-green-900/30">
          <div
            className="h-11 w-11 rounded-full bg-green-600 flex items-center justify-center text-black font-bold overflow-hidden cursor-pointer"
            onClick={() => setImageUploadPop(true)}
          >
            {selectedUser?.image ? (
              <img
                src={selectedUser.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : selectedUser ? (
              <span>{selectedUser.username?.[0]?.toUpperCase()}</span>
            ) : null}
          </div>
          <div>
            <h2 className="text-green-300 font-semibold">
              {selectedUser?.username || "Select someone to chat"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Online
            </div>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-black via-gray-950 to-black">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-3 ${
                msg.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  msg.sender === "me"
                    ? "bg-green-600 text-black rounded-br-none"
                    : "bg-gray-800 text-white rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>

        {/* Input area */}
        <footer className="p-4 bg-gray-950 border-t border-green-900/30 flex items-center gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 px-5 py-3 rounded-full bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          {selectedRecipientId && selectedRecipientId !== senderId && (
            <button
              onClick={sendMessage}
              className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 text-black font-bold flex items-center justify-center shadow-lg transition-colors"
              disabled={!input.trim()}
            >
              ➤
            </button>
          )}
        </footer>
      </section>

      {/* Right sidebar - Your profile */}
      <aside className="hidden lg:flex w-80 bg-gray-950 border-l border-green-900/30 flex-col items-center py-10">
        <div className="flex flex-col items-center">
          <div
            className="h-56 w-56 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-black text-4xl font-bold cursor-pointer overflow-hidden border-4 border-green-500/40 shadow-xl"
            onClick={() => setImageUploadPop(true)}
          >
            {yourImage ? (
              <img
                src={yourImage}
                alt="Your profile"
                className="h-full w-full object-cover"
                onError={() => setYourImage("")}
              />
            ) : (
              <span>{name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>

          <div className="mt-8 text-center px-6">
            <p className="text-gray-300">Welcome back</p>
            <h1 className="text-green-400 text-3xl font-bold mt-1">{name}</h1>
            {description && (
              <p className="text-gray-400 text-sm mt-3 italic">~ {description}</p>
            )}
          </div>
        </div>

        <div className="mt-auto mb-8 w-full px-8">
          <button
            onClick={logout}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Upload modal */}
      {imageUploadPop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl p-7 w-full max-w-sm mx-4 shadow-2xl border border-green-900/30">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-green-400 text-xl font-semibold">Change Profile Picture</h2>
              <button
                onClick={() => {
                  setImageUploadPop(false);
                  setUploadImage(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {uploadImage && (
              <div className="mb-6 rounded-xl overflow-hidden border border-green-800/40">
                <img
                  src={URL.createObjectURL(uploadImage)}
                  alt="Preview"
                  className="w-full h-56 object-cover"
                />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-black hover:file:bg-green-700 cursor-pointer"
              onChange={(e) => setUploadImage(e.target.files?.[0] || null)}
            />

            <button
              onClick={handleUpload}
              disabled={!uploadImage}
              className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:text-gray-400 text-black font-semibold rounded-lg transition-colors"
            >
              Upload Picture
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBoard;