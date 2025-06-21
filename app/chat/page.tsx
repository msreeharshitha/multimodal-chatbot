"use client";

import { useState, useRef, useEffect } from "react";
import { BsFillPencilFill } from "react-icons/bs";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! I’m your AI assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedInput, setEditedInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() && !file) return;

    const formData = new FormData();
    formData.append(
      "messages",
      JSON.stringify([...messages, { role: "user", content: input }])
    );
    if (file) formData.append("file", file);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input || "[📁 File uploaded]" },
    ]);
    setInput("");
    setFile(null);

    const res = await fetch("/api/chat", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.reply) {
      setMessages((prev) => [...prev, data.reply]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Oops! Something went wrong. Try again.",
        },
      ]);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-tr from-blue-50 via-white to-purple-50 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`md:w-64 w-full bg-white shadow-lg p-4 border-r transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "block" : "hidden md:block"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">🕘 Chat History</h2>
        <ul className="space-y-2 text-sm max-h-[70vh] overflow-y-auto">
          {messages
            .filter((m) => m.role === "user")
            .map((msg, idx) => (
              <li
                key={idx}
                className="p-2 bg-gray-100 rounded hover:bg-blue-200 cursor-pointer transition truncate"
                title={msg.content}
              >
                {msg.content.slice(0, 40)}
              </li>
            ))}
        </ul>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-gradient-to-r from-blue-700 to-purple-600 text-white p-6 text-center shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wide">
            🤖 Igerba Education Chatbot
          </h1>
          <p className="text-sm opacity-90 mt-1">AI-powered academic assistant</p>
          <button
            className="md:hidden mt-4 bg-white text-blue-600 px-4 py-2 rounded shadow"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            📋 Toggle Chat History
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isAssistant = msg.role === "assistant";

              return (
                <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative group rounded-2xl px-5 py-4 max-w-[80%] text-sm sm:text-base shadow-md whitespace-pre-wrap transition-all duration-200 ${
                      isUser
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : isAssistant
                        ? "bg-white text-black border border-gray-200 rounded-tl-none"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 uppercase text-gray-300">
                      {isUser ? "You" : isAssistant ? "Bot" : "System"}
                    </div>

                    {editingIndex === idx ? (
                      <div className="w-full">
                        <textarea
                          value={editedInput}
                          onChange={(e) => setEditedInput(e.target.value)}
                          className="w-full text-black p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2 text-xs">
                          <button
                            onClick={async () => {
                              const updatedMessages = [...messages];
                              updatedMessages[idx].content = editedInput;
                              updatedMessages.splice(idx + 1);

                              setEditingIndex(null);
                              setMessages(updatedMessages);

                              const formData = new FormData();
                              formData.append(
                                "messages",
                                JSON.stringify(updatedMessages)
                              );

                              const res = await fetch("/api/chat", {
                                method: "POST",
                                body: formData,
                              });
                              const data = await res.json();

                              setMessages((prev) => [
                                ...prev,
                                data.reply || {
                                  role: "assistant",
                                  content: "⚠️ Could not fetch reply.",
                                },
                              ]);
                            }}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            ✅ Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.content}
                        {isUser && (
                          <button
                            onClick={() => {
                              setEditingIndex(idx);
                              setEditedInput(msg.content);
                            }}
                            className="absolute top-2 right-2 hidden group-hover:inline-block text-white bg-transparent"
                          >
                            <BsFillPencilFill className="text-xs" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </main>

        <footer className="bg-white shadow-inner p-4">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition cursor-pointer"
            >
              📎 Upload
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            <button
              onClick={sendMessage}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:opacity-90 transition"
            >
              ➤ Send
            </button>

            <button
              onClick={() => setMessages([])}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
            >
              ❌ Clear
            </button>
          </div>

          {file && (
            <div className="max-w-3xl mx-auto mt-2 text-sm text-gray-600 text-center">
              📁 Selected File: <span className="font-medium">{file.name}</span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
