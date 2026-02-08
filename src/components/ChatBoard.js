import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";

const ChatBoard = () => {
  const [messages, setMessages] = useState([]);
  const [imageUploadPop, setImageUploadPop] = useState(false);
  const [uploadImage, setUploadImage] = useState(null);
  const [search, setSearch] = useState("");
  const [debounce, setDebounce] = useState("");
  // const socket = io("http://localhost:5000");
  const socketRef = useRef(null);
  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const senderId = localStorage.getItem("userId");
  const name = localStorage.getItem("userName");
  const [input, setInput] = useState("");
  const [yourImage, setYourImage] = useState("");
  const [newReciepient, setNewReciepient] = useState(null);
  const messagesEndRef = useRef(null);
  const [recpient, setRecpient] = useState([]);
  const description = localStorage.getItem("description");
  const getReciepient = async () => {
    const res = await fetch(`http://localhost:5000/api/users/getAllUser`);
    const data = await res.json();
    setRecpient(data);
  };
  const handleSignout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  const getMessages = async () => {
    const res = await fetch(
      `http://localhost:5000/api/messages/getMessages/${senderId}/${newReciepient}`,
    );
    const data = await res.json();
    const formattedMessages = data.map((msg) => ({
      id: msg.id,
      text: msg.message,
      sender: msg.sender_id === senderId ? "me" : "other",
    }));
    setMessages(formattedMessages);
  };
  const filteredRecpient = recpient.filter((u) => u.username.includes(debounce));
  useEffect(() => {
    {
      newReciepient && getMessages();
    }
    getReciepient();
  }, [newReciepient]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!selectedUser || newReciepient === senderId) {
      alert("Please select a valid recipient.");
      return;
    }
    const messagePayload = {
      senderId,
      reciepientId: newReciepient,
      messageText: input,
    };

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: input, sender: "me" },
    ]);

    setInput("");

    socketRef.current.emit("sendMessage", messagePayload);

    await fetch(`http://localhost:5000/api/messages/createMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messagePayload),
    });
  };
  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("receiveMessage", (message) => {
      if (
        message.senderId === newReciepient ||
        message.reciepientId === newReciepient
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
    });

    return () => {
      socketRef.current.off("receiveMessage");
    };
  }, [newReciepient, senderId]);

  useEffect(() => {
    if (senderId && socketRef.current) {
      socketRef.current.emit("join", senderId);
    }
  }, [senderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async () => {
    if (!uploadImage) return;

    try {
      const formData = new FormData();
      formData.append("image", uploadImage); // ← actual File
      formData.append("userId", senderId);

      await fetch("http://localhost:5000/api/images/uploadImage", {
        method: "POST",
        body: formData, // ← important: no Content-Type header
      });
      setImageUploadPop(false);
    } catch (err) {
      console.error("Error uploading image:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounce(search);
    },2000);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const myImg = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/images/getImage/${senderId}`,
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data.imageBase64) {
          setYourImage(data.imageBase64);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (senderId) myImg();
  }, [senderId]);
  const selectedUser = recpient.find((u) => u.id === newReciepient);
  return (
    <div className="h-screen w-screen bg-black flex">
      {/* Sidebar - Desktop only */}
      <aside className="hidden md:flex w-[320px] bg-gray-950 border-r border-green-500/20 flex-col">
        <div className="px-4 py-4 border-b border-green-500/20">
          <h1 className="text-green-400 text-xl font-bold">CONVO</h1>
          <input
            placeholder="Search or start new chat"
            className="mt-3 w-full px-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filteredRecpient.length > 0
          ? filteredRecpient.map((user) => (
              <div key={user.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-900 cursor-pointer"
                  onClick={() => setNewReciepient(user.id)}
                >
                  <div className="h-10 w-10 rounded-full bg-green-500 text-black flex items-center justify-center font-bold">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt="User"
                        className="h-full w-full object-cover rounded-full border-2 border-green-500"
                      />
                    ) : (
                      <h1>{user.username.slice(0, 2).toUpperCase()}</h1>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.username}</p>
                    <p className="text-xs text-gray-400 truncate">
                      Hi! Welcome to CONVO 💚
                    </p>
                  </div>
                </div>
              </div>
            ))
          : recpient.map((user) => (
              <div key={user.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-900 cursor-pointer"
                  onClick={() => setNewReciepient(user.id)}
                >
                  <div className="h-10 w-10 rounded-full bg-green-500 text-black flex items-center justify-center font-bold">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt="User"
                        className="h-full w-full object-cover rounded-full border-2 border-green-500"
                      />
                    ) : (
                      <h1>{user.username.slice(0, 2).toUpperCase()}</h1>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.username}</p>
                    <p className="text-xs text-gray-400 truncate">
                      Hi! Welcome to CONVO 💚
                    </p>
                  </div>
                </div>
              </div>
            ))}
      </aside>

      {/* Chat Section */}
      <section className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-950/80 border-b border-green-500/20">
          <div
            className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold text-black"
            onClick={() => setImageUploadPop(true)}
          >
            {selectedUser ? (
              selectedUser.image ? (
                <img
                  src={selectedUser.image}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span>{selectedUser.username.slice(0, 1).toUpperCase()}</span>
              )
            ) : (
              ""
            )}
          </div>
          <div>
            <h2 className="text-green-400 font-semibold">
              {newReciepient
                ? recpient.find((u) => u.id === newReciepient)?.username
                : "Select a user"}
            </h2>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              Online
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/30 bg-gradient-to-br from-green-500/5 via-transparent to-black">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-md ${
                  msg.sender === "me"
                    ? "bg-green-500 text-black rounded-br-md"
                    : "bg-gray-800 text-white rounded-bl-md"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-gray-950 border-t border-green-500/20 flex items-center gap-3">
          <input
            type="text"
            placeholder="Type a message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 px-5 py-3 rounded-full bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {selectedUser && newReciepient !== senderId && (
            <button
              onClick={sendMessage}
              className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 text-black font-bold shadow-lg"
            >
              ➤
            </button>
          )}
        </div>
      </section>

      <aside className="hidden md:flex w-[320px] bg-gray-950 border-r border-green-500/20 py-10 flex-col items-center justify-between h-screen">
        {/* Top section: Avatar */}
        <div className="flex flex-col items-center">
          <div
            className="h-60 w-60 bg-green-500 rounded-full m-4 flex items-center justify-center text-black text-2xl cursor-pointer"
            onClick={() => setImageUploadPop(true)}
          >
            {yourImage ? (
              <div className="h-50 w-50 bg-green-500 rounded-full">
                <img
                  src={yourImage}
                  alt="User"
                  className="h-full border-4 border-green-500 w-full object-cover rounded-full"
                />
              </div>
            ) : (
              <h2 className="text-green-400 font-semibold text-center">
                {newReciepient
                  ? recpient.find((u) => u.id === newReciepient)?.username
                  : "Select a user"}
              </h2>
            )}
          </div>

          {/* Additional content */}
          <div className="mt-6 flex flex-col items-center space-y-4">
            <p className="text-gray-300">Welcome back!</p>
            <h1 className="text-green-500 text-3xl font-bold"> {name}</h1>
            <p className="text-gray-400 text-sm p-6">~ {description}</p>
          </div>
        </div>

        {/* Bottom section: Logout */}
        <div className="mb-6 w-full px-6">
          <button
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded font-semibold"
            onClick={handleSignout} // your logout function
          >
            Logout
          </button>
        </div>
      </aside>

      {imageUploadPop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 rounded-xl p-6 w-80 shadow-lg relative">
            <button
              onClick={() => setImageUploadPop(false)}
              className="absolute top-3 right-3 text-green-400 font-bold text-xl"
            >
              ×
            </button>
            <h2 className="text-green-400 text-lg font-semibold mb-4">
              Upload Image
            </h2>
            {uploadImage && (
              <img
                src={uploadImage ? URL.createObjectURL(uploadImage) : ""}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            <input
              type="file"
              accept="image/*"
              className="w-full text-white"
              onChange={(e) => setUploadImage(e.target.files[0])}
            />
            <button
              className="mt-4 w-full py-2 bg-green-500 text-black rounded-lg hover:bg-green-600"
              onClick={handleUpload}
            >
              Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBoard;
