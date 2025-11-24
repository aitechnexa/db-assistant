import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Send, Bot, User, Loader2, Database, Code, Lightbulb,
  TrendingUp, Brain, Sparkles, CheckCircle, AlertCircle,
  Table as TableIcon, BarChart3, Moon, Sun, Settings,
  MessageSquare, ChevronRight, Copy, Check, ChevronDown, Plus,
  PanelLeftClose, PanelLeftOpen, Play, PieChart, LineChart, ScatterChart, AreaChart
} from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, Pie, Scatter, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart as RePieChart, ScatterChart as ReScatterChart } from 'recharts'
import SchemaViewer from './SchemaViewer'
import ChatSidebar from './components/ChatSidebar'
import ResultsDisplay from './components/ResultsDisplay'
import { useQuota } from './context/QuotaContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

const chartPalette = ['#2563eb', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#6366f1', '#ef4444', '#eab308']

// Message Component
function ChatMessage({ message, darkMode, onClarificationSelect }) {
  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-600' : 'bg-purple-500'} h-fit`}>
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'order-first' : ''}`}>
        {message.role === 'assistant' ? (
          <div className="space-y-2">
            {message.thinking && (
              <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                {message.thinking}
              </div>
            )}
            {message.content && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
                <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none text-sm`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {/* Clarification Options */}
            {message.clarification && (
              <div className="space-y-2 mt-3">
                <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Please select one:
                </div>
                <div className="space-y-2">
                  {message.clarification.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => onClarificationSelect && onClarificationSelect(option)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${darkMode
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-blue-500 text-white'
                        : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-500 text-gray-900'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                          }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-lg p-3`}>
            <div className="text-sm">
              {message.content}
            </div>
          </div>
        )}
      </div>

      {message.role === 'user' && (
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} h-fit`}>
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  )
}

// Main Agentic Chatbot Component
// Main Agentic Chatbot Component
export default function AgenticChatbot({ connectionId, darkMode, databases, onSelectDatabase, onAddDatabase, conversationId: initialConversationId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentResults, setCurrentResults] = useState(null)
  const [currentSummary, setCurrentSummary] = useState('')
  const [currentSQL, setCurrentSQL] = useState('')
  const [useDeepThink, setUseDeepThink] = useState(false)
  const [showDbSelector, setShowDbSelector] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(initialConversationId)
  const [conversationTitle, setConversationTitle] = useState('New Conversation')
  const [showSchema, setShowSchema] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const { refreshQuota } = useQuota()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId)
    } else {
      // New conversation - clear everything
      setMessages([])
      setCurrentResults(null)
      setCurrentSummary('')
      setCurrentSQL('')
      setCurrentConversationId(null)
      setConversationTitle('New Conversation')
    }
  }, [initialConversationId])

  const createNewConversation = async (firstMessage) => {
    try {
      const token = localStorage.getItem('token')
      const title = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '')

      const response = await axios.post(`${API_URL}/api/conversations/`, {
        title,
        connection_id: connectionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setCurrentConversationId(response.data.id)
      setConversationTitle(response.data.title)
      return response.data.id
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }

  const loadConversation = async (id) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const conversation = response.data
      setCurrentConversationId(conversation.id)
      setConversationTitle(conversation.title)

      // Load messages
      const loadedMessages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      setMessages(loadedMessages)

      // Load last SQL, summary, and results from metadata if available
      const lastAssistantMsg = conversation.messages.filter(m => m.role === 'assistant').pop()
      if (lastAssistantMsg && lastAssistantMsg.metadata) {
        setCurrentSQL(lastAssistantMsg.metadata.sql || '')
        setCurrentSummary(lastAssistantMsg.metadata.summary || '')
        setCurrentResults(lastAssistantMsg.metadata.results || null)
      }

    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    sendMessage(message)
  }

  const handleClarificationSelect = (selectedOption) => {
    // When user selects a clarification option, send it as a new query
    setMessages(prev => [...prev, {
      role: 'user',
      content: selectedOption
    }])
    sendMessage(selectedOption)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: input.trim(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    const messageContent = input.trim()
    setInput('')
    setIsLoading(true)
    setCurrentResults(null)
    setCurrentSummary('')
    setCurrentSQL('')

    // Create conversation on first message
    let conversationId = currentConversationId
    if (!conversationId && messages.length === 0) {
      conversationId = await createNewConversation(messageContent)
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          connection_id: connectionId,
          conversation_id: conversationId,
          use_deep_think: useDeepThink
        })
      })

      if (response.status === 401) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Session expired. Please refresh the page or log in again.',
          type: 'text'
        }])
        setIsLoading(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // Keep the last line in the buffer as it might be incomplete
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'thinking') {
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  // Only update if last message is from assistant and has thinking or no content yet
                  if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
                    lastMsg.thinking = data.content
                    return newMessages
                  }
                  // Otherwise create new thinking message
                  return [...prev, {
                    role: 'assistant',
                    thinking: data.content
                  }]
                })
              } else if (data.type === 'tool_call') {
                // Don't show tool calls in chat
              } else if (data.type === 'sql') {
                setCurrentSQL(data.content)
              } else if (data.type === 'reasoning') {
                // Don't show reasoning in chat
              } else if (data.type === 'results') {
                setCurrentResults(data.content)
              } else if (data.type === 'answer') {
                // Ensure content is a string
                const answerContent = typeof data.content === 'string'
                  ? data.content
                  : JSON.stringify(data.content, null, 2)

                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  // Replace thinking message with answer
                  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.thinking && !lastMsg.content) {
                    return [
                      ...newMessages.slice(0, -1),
                      {
                        role: 'assistant',
                        content: answerContent
                      }
                    ]
                  }
                  // Otherwise add new message
                  return [...prev, {
                    role: 'assistant',
                    content: answerContent
                  }]
                })
              } else if (data.type === 'summary') {
                setCurrentSummary(data.content)
              } else if (data.type === 'clarification') {
                // Show clarification options as buttons
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  // Replace thinking message with clarification
                  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.thinking && !lastMsg.content) {
                    return [
                      ...newMessages.slice(0, -1),
                      {
                        role: 'assistant',
                        content: 'I need clarification - which interpretation did you mean?',
                        clarification: {
                          options: data.options,
                          originalQuestion: data.original_question
                        }
                      }
                    ]
                  }
                  // Otherwise add new message
                  return [...prev, {
                    role: 'assistant',
                    content: 'I need clarification - which interpretation did you mean?',
                    clarification: {
                      options: data.options,
                      originalQuestion: data.original_question
                    }
                  }]
                })
              } else if (data.type === 'error') {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `❌ Error: ${data.content}`,
                  type: 'text'
                }])
              } else if (data.type === 'done') {
                setIsLoading(false)
                refreshQuota() // Refresh quota after successful query
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        type: 'text'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunCustomQuery = async (sql) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const userMessage = {
        role: 'user',
        content: `Execute this SQL query directly:\n\`\`\`sql\n${sql}\n\`\`\``,
        type: 'text'
      }

      setMessages(prev => [...prev, userMessage])

      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          connection_id: connectionId,
          conversation_id: currentConversationId,
          use_deep_think: false
        })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'results') setCurrentResults(data.content)
              else if (data.type === 'sql') setCurrentSQL(data.content)
              else if (data.type === 'summary') setCurrentSummary(data.content)
              else if (data.type === 'done') {
                setIsLoading(false)
                refreshQuota()
              }
            } catch (e) { console.error(e) }
          }
        }
      }

    } catch (error) {
      console.error('Query error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSelectConversation = (id) => {
    loadConversation(id)
  }

  const handleDeleteConversation = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (currentConversationId === id) {
        setMessages([])
        setCurrentResults(null)
        setCurrentSummary('')
        setCurrentSQL('')
        setCurrentConversationId(null)
        setConversationTitle('New Conversation')
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  return (
    <div className={`flex ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`} style={{ height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        darkMode={darkMode}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={() => {
          // Clear all state for new conversation
          setMessages([])
          setCurrentResults(null)
          setCurrentSummary('')
          setCurrentSQL('')
          setCurrentConversationId(null)
          setConversationTitle('New Conversation')
          setInput('')
        }}
      />

      {/* Left Panel - Chat Interface */}
      <div className={`flex-1 flex flex-col border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} min-w-0`}>
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                title={isSidebarOpen ? 'Hide conversations' : 'Show conversations'}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5" />
                )}
              </button>
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-600' : 'bg-purple-500'}`}>
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  AI Assistant
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ask questions about your data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDeepThink}
                  onChange={(e) => setUseDeepThink(e.target.checked)}
                  className="rounded"
                />
                <span className={`text-sm flex items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Brain className="w-4 h-4" />
                  Deep Think
                </span>
              </label>
            </div>
          </div>

          {/* Database Selector */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <button
                onClick={() => setShowDbSelector(!showDbSelector)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">
                    {databases?.find(db => db.id === connectionId)?.name || 'Select Database'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDbSelector && (
                <div className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className="max-h-60 overflow-y-auto">
                    {databases?.map(db => (
                      <button
                        key={db.id}
                        onClick={() => {
                          onSelectDatabase(db.id)
                          setShowDbSelector(false)
                          setMessages([])
                          setCurrentResults(null)
                          setCurrentSummary('')
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-opacity-10 ${db.id === connectionId
                          ? darkMode ? 'bg-blue-600 bg-opacity-20' : 'bg-blue-50'
                          : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                          } ${darkMode ? 'text-white' : 'text-gray-700'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{db.name}</div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {db.type} • {db.database}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button
                      onClick={() => {
                        onAddDatabase()
                        setShowDbSelector(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-50 text-blue-600'
                        }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add New Database
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Welcome to AI Assistant
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                Ask me anything about your database
              </p>
              <div className={`grid grid-cols-1 gap-2 max-w-md mx-auto text-left`}>
                {[
                  'Show me top 10 customers by revenue',
                  'What are the sales trends this month?',
                  'Which products are most profitable?'
                ].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(example)}
                    className={`p-3 rounded-lg text-sm text-left ${darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                      }`}
                  >
                    <ChevronRight className="w-4 h-4 inline mr-2" />
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              message={msg}
              darkMode={darkMode}
              onClarificationSelect={handleClarificationSelect}
            />
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center`}>
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-4`}>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your data..."
              rows={1}
              className={`flex-1 px-4 py-3 rounded-lg resize-none ${darkMode
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${isLoading || !input.trim()
                ? darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                : darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-50 hover:bg-blue-600 text-white'
                }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Results Display */}
      <div className={`w-1/2 flex flex-col min-w-0`}>
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Results & Insights
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Live data visualization and analysis
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSchema(!showSchema)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
              title={showSchema ? 'Hide Schema' : 'Show Schema'}
            >
              <Database className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <ResultsDisplay
              results={currentResults}
              summary={currentSummary}
              sql={currentSQL}
              darkMode={darkMode}
              onRunQuery={handleRunCustomQuery}
              connectionId={connectionId}
            />
          </div>

          {/* Schema Sidebar (Right) */}
          {showSchema && (
            <div className={`w-64 border-l overflow-y-auto p-4 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>
                <Database className="w-4 h-4" />
                Schema
              </h3>
              <SchemaViewer connectionId={connectionId} darkMode={darkMode} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
