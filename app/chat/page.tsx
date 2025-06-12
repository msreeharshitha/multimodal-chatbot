'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! Ask me anything.'
    }
  ])
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sendMessage = async () => {
    if (!input.trim() && !file) return

    const formData = new FormData()
    formData.append('messages', JSON.stringify([...messages, { role: 'user', content: input }]))
    if (file) formData.append('file', file)

    setMessages(prev => [...prev, { role: 'user', content: input || '[File uploaded]' }])
    setInput('')
    setFile(null)

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData
    })

    const data = await res.json()

    if (data.reply) {
      setMessages(prev => [...prev, data.reply])
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.'
      }])
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 text-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 text-center shadow-md">
        <h1 className="text-3xl font-bold tracking-wide">🤖 Igerba Education Bot</h1>
      </header>

      {/* Chat messages */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-5 py-4 max-w-[80%] shadow-md whitespace-pre-wrap text-sm sm:text-base ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : msg.role === 'assistant'
                    ? 'bg-white text-gray-800 rounded-tl-none'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                <div className="font-semibold mb-1 text-xs uppercase tracking-wide">
                  {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Bot' : 'System'}
                </div>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white p-4 border-t shadow-inner">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />

          {/* Upload Button */}
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition cursor-pointer"
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

          {/* Send Button */}
          <button
            onClick={sendMessage}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Send ➤
          </button>

          {/* Clear Button */}
          <button
            onClick={() => setMessages([])}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
          >
            ❌ Clear
          </button>
        </div>

        {/* File name preview */}
        {file && (
          <div className="max-w-2xl mx-auto mt-2 text-sm text-gray-600 text-center">
            📁 <span className="font-medium">{file.name}</span>
          </div>
        )}
      </footer>
    </div>
  )
}
