import React, { useState, useRef, useEffect } from "react";

const ChatBoard = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey! 👋", sender: "other" },
    { id: 2, text: "Hi! Welcome to CONVO 💚", sender: "me" },
  ]);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: input, sender: "me" },
    ]);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-screen w-screen bg-black flex">
      {/* Sidebar - Desktop only */}
      <aside className="hidden md:flex w-[320px] bg-gray-950 border-r border-green-500/20 flex-col">
        <div className="px-4 py-4 border-b border-green-500/20">
          <h1 className="text-green-400 text-xl font-bold">CONVO</h1>
          <input
            placeholder="Search or start new chat"
            className="mt-3 w-full px-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-900 cursor-pointer">
            <div className="h-10 w-10 rounded-full bg-green-500 text-black flex items-center justify-center font-bold">
              C
            </div>
            <div>
              <p className="text-white font-medium">CONVO Support</p>
              <p className="text-xs text-gray-400 truncate">
                Hi! Welcome to CONVO 💚
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Chat Section */}
      <section className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-950/80 border-b border-green-500/20">
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center font-bold text-black">
            C
          </div>
          <div>
            <h2 className="text-green-400 font-semibold">CONVO Support</h2>
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
          <button
            onClick={sendMessage}
            className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 text-black font-bold shadow-lg"
          >
            ➤
          </button>
        </div>
      </section>
    </div>
  );
};

export default ChatBoard;
