import React, { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Plus, Loader2, MoreVertical } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function ChatSidebar({
    darkMode,
    isOpen,
    onClose,
    onSelectConversation,
    onDeleteConversation,
    currentConversationId,
    onNewChat
}) {
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        if (isOpen) {
            fetchConversations()
        }
    }, [isOpen])

    const fetchConversations = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_URL}/api/conversations/`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setConversations(response.data)
        } catch (error) {
            console.error('Failed to fetch conversations:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation()
        if (!window.confirm('Are you sure you want to delete this conversation?')) return

        try {
            setDeletingId(id)
            const token = localStorage.getItem('token')
            await axios.delete(`${API_URL}/api/conversations/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setConversations(prev => prev.filter(c => c.id !== id))

            // If deleting current conversation, trigger new chat
            if (currentConversationId === id) {
                if (onDeleteConversation) {
                    onDeleteConversation(id)
                } else if (onNewChat) {
                    onNewChat()
                }
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error)
        } finally {
            setDeletingId(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className={`w-64 flex-shrink-0 border-r flex flex-col h-full ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={onNewChat}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className={`w-6 h-6 animate-spin ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <p className="text-sm">No conversations yet</p>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                            className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${currentConversationId === conv.id
                                ? darkMode ? 'bg-gray-800 text-white' : 'bg-white shadow-sm text-gray-900'
                                : darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {conv.title || 'New Conversation'}
                                </p>
                                <p className="text-xs opacity-60 truncate">
                                    {new Date(conv.updated_at).toLocaleDateString()}
                                </p>
                            </div>

                            <button
                                onClick={(e) => handleDelete(e, conv.id)}
                                className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-300 text-gray-500 hover:text-red-500'
                                    }`}
                            >
                                {deletingId === conv.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3 h-3" />
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
