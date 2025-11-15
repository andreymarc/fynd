import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Message } from '../types/database.types'
import { Send, Loader } from 'lucide-react'

interface MessagingProps {
  itemId: string
  itemOwnerId: string
  currentUserId: string
  otherUserId: string
  otherUserEmail?: string
  // itemOwnerId is kept for potential future use (e.g., showing owner badge)
}

export default function Messaging({
  itemId,
  currentUserId,
  otherUserId,
  otherUserEmail
}: MessagingProps) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    markMessagesAsRead()

    // Poll for new messages every 5 seconds (instead of real-time to avoid costs)
    const interval = setInterval(() => {
      fetchMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [itemId, currentUserId, otherUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(email, full_name),
          receiver:profiles!messages_receiver_id_fkey(email, full_name)
        `)
        .eq('item_id', itemId)
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
      
      // Count unread messages
      const unread = (data || []).filter(
        msg => msg.receiver_id === currentUserId && !msg.read
      ).length
      setUnreadCount(unread)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('item_id', itemId)
        .eq('receiver_id', currentUserId)
        .eq('read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          item_id: itemId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          message: newMessage.trim(),
          read: false
        })

      if (error) throw error

      setNewMessage('')
      // Refresh messages
      await fetchMessages()
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(t('messaging.sendError', 'Failed to send message: ') + error.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-gray-400" size={24} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('messaging.messages', 'Messages')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {otherUserEmail || t('messaging.user', 'User')}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>{t('messaging.noMessages', 'No messages yet. Start the conversation!')}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className={`flex items-center gap-2 mt-1 text-xs ${
                    isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {isOwn && msg.read && (
                      <span className="text-blue-200">✓✓</span>
                    )}
                    {isOwn && !msg.read && (
                      <span className="text-blue-200">✓</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('messaging.typeMessage', 'Type a message...')}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

