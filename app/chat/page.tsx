'use client'

import { useState, useRef, useEffect } from 'react'

// Message interface to define chat roles
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatPage() {
  // Store messages between user and assistant
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! Ask me anything or upload a file (image or PDF).'
    }
  ])

  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Send message or file to backend
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

  // Auto scroll to last message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-md p-4 text-center text-2xl font-semibold text-blue-700">
        Igerba Education Bot
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`rounded-xl shadow-sm px-5 py-4 max-w-[80%] whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.role === 'assistant'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                <div className="text-sm font-semibold mb-1">
                  {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Bot' : 'System'}
                </div>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </main>

      <footer className="bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message here..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label htmlFor="file-upload" className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-200 transition">
            Upload File
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Send
          </button>

          <button
            onClick={() => setMessages([])}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
          >
            Clear Chat
          </button>
        </div>

        {file && (
          <div className="max-w-2xl mx-auto mt-2 text-sm text-gray-600 text-center">
            Selected File: <span className="font-medium">{file.name}</span>
          </div>
        )}
      </footer>
    </div>
  )
}
