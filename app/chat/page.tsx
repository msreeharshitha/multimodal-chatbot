'use client'

import { useState, useRef, useEffect } from 'react'

// Define the structure for each chat message
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatPage() {
  // Initialize message state with an assistant's welcome message
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hello! Ask me anything or upload an image.'
  }])

  // State for input text and uploaded image
  const [input, setInput] = useState('')
  const [image, setImage] = useState<File | null>(null)

  // Ref for auto-scrolling to the latest message
  const scrollRef = useRef<HTMLDivElement>(null)

  // Function to send a message to the backend API
  const sendMessage = async () => {
    // Prevent sending if no input or image
    if (!input.trim() && !image) return

    // Prepare form data with messages and optional image
    const formData = new FormData()
    formData.append('messages', JSON.stringify([...messages, { role: 'user', content: input }]))
    if (image) formData.append('image', image)

    // Show the user's message in the chat UI
    setMessages(prev => [...prev, { role: 'user', content: input || '[Image uploaded]' }])
    setInput('')
    setImage(null)

    // Send the request to /api/chat and wait for a reply
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData
    })

    const data = await res.json()

    // If a valid reply is received, display it
    if (data.reply) {
      setMessages(prev => [...prev, data.reply])
    } else {
      // If an error occurs, show fallback message
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
  }

  // Automatically scroll to the bottom when new messages are added
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* Page header */}
      <header className="bg-white shadow-md p-4 text-center text-2xl font-semibold text-blue-700">
       🤖 Igerba Education Bot 
      </header>

      {/* Chat message area */}
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

      {/* Input and upload section */}
      <footer className="bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message here..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Image upload button */}
          <label htmlFor="image-upload" className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-200 transition">
            Upload Image
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="hidden"
          />

          {/* Send button */}
          <button
            onClick={sendMessage}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Send
          </button>
        </div>

        {/* Display selected image name */}
        {image && (
          <div className="max-w-2xl mx-auto mt-2 text-sm text-gray-500 text-center">
            Selected Image: <span className="font-medium">{image.name}</span>
          </div>
        )}
      </footer>
    </div>
  )
}
