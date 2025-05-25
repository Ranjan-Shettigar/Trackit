'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Layout from '@/components/layout'
import pb from '@/utils/pocketbase'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleSendMessage = async () => {
    if (!input.trim()) return

    const newMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' }
    setMessages((prevMessages: Message[]) => [...prevMessages, newMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Get current user information
      const userId = pb.authStore.model?.id;
      const authToken = pb.authStore.token;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: input, 
          userId,
          authToken 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const data = await response.json()
      console.log('AI API response:', data)
      const aiMessage: Message = { id: Date.now().toString(), text: data.response, sender: 'ai' }
      setMessages((prevMessages: Message[]) => [...prevMessages, aiMessage])
    } catch (err: unknown) {
      let errorMessageText = 'An unexpected error occurred.';
      if (err instanceof Error) {
        errorMessageText = err.message;
      }
      setError(errorMessageText)
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: errorMessageText,
        sender: 'ai',
      }
      setMessages((prevMessages: Message[]) => [...prevMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <h1 className="text-3xl font-bold mb-6">AI Chat</h1>
        <ScrollArea className="flex-grow p-4 border rounded-md mb-4">
          {messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={`mb-2 p-2 rounded-lg max-w-[70%] ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white self-end ml-auto'
                  : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white self-start mr-auto'
              }`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
          ))}
        </ScrollArea>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your transactions..."
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Layout>
  )
}
