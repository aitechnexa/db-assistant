import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { MessageSquare, Plus, Trash2, Edit2, Check, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function ConversationSidebar({ 
  darkMode, 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation,
  selectedDb 
}) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/conversations/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConversations(response.data)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (conversationId, e) => {
    e.stopPropagation()
    
    if (!confirm('Delete this conversation?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setConversations(conversations.filter(c => c.id !== conversationId))
      
      if (currentConversationId === conversationId) {
        onSelectConversation(null)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation')
    }
  }

  const handleStartEdit = (conversation, e) => {
    e.stopPropagation()
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }

  const handleSaveEdit = async (conversationId, e) => {
    e.stopPropagation()
    
    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${API_URL}/api/conversations/${conversationId}`,
        { title: editTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setConversations(conversations.map(c => 
        c.id === conversationId ? { ...c, title: editTitle } : c
      ))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating conversation:', error)
      alert('Failed to update conversation')
    }
  }

  const handleCancelEdit = (e) => {
    e.stopPropagation()
    setEditingId(null)
    setEditTitle('')
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <div className={`w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col h-full`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={onNewConversation}
          disabled={!selectedDb}
          className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
            selectedDb
              ? darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              : darkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>
        {!selectedDb && (
          <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Select a database first
          </p>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading...
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center">
            <MessageSquare className={`w-12 h-12 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No conversations yet
            </p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors group ${
                  currentConversationId === conversation.id
                    ? darkMode ? 'bg-blue-600 bg-opacity-20' : 'bg-blue-50'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                {editingId === conversation.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`flex-1 px-2 py-1 text-sm rounded ${
                        darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                      } border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(conversation.id, e)
                        if (e.key === 'Escape') handleCancelEdit(e)
                      }}
                    />
                    <button
                      onClick={(e) => handleSaveEdit(conversation.id, e)}
                      className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-sm font-medium line-clamp-2 flex-1 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {conversation.title}
                      </h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartEdit(conversation, e)}
                          className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(conversation.id, e)}
                          className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                    
                    {conversation.last_message && (
                      <p className={`text-xs line-clamp-2 mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {conversation.last_message}
                      </p>
                    )}
                    
                    <div className={`flex items-center justify-between text-xs ${
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <span>{conversation.message_count} messages</span>
                      <span>{formatDate(conversation.updated_at)}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
