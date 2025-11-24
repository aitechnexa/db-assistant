import React, { useState, useEffect } from 'react'
import { Play, Database, Loader2, Code, ChevronDown, Plus } from 'lucide-react'
import axios from 'axios'
import ResultsDisplay from './ResultsDisplay'
import SchemaViewer from '../SchemaViewer'
import { useQuota } from '../context/QuotaContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function SqlRunner({ darkMode, databases, onSelectDatabase, onAddDatabase }) {
    const [selectedDb, setSelectedDb] = useState(null)
    const [sql, setSql] = useState('')
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showDbSelector, setShowDbSelector] = useState(false)
    const [showSchema, setShowSchema] = useState(true)

    const { refreshQuota } = useQuota()

    useEffect(() => {
        if (databases.length > 0 && !selectedDb) {
            setSelectedDb(databases[0].id)
        }
    }, [databases])

    const handleRunQuery = async () => {
        if (!sql.trim() || !selectedDb) return

        setLoading(true)
        setError(null)
        setResults(null)

        try {
            const token = localStorage.getItem('token')

            // Use the chat stream endpoint with a specific instruction for now, 
            // or better, use the /api/query endpoint if it supported raw SQL execution.
            // The current backend doesn't seem to have a direct raw SQL endpoint for arbitrary queries exposed easily 
            // without the agent wrapper, BUT the agent can handle "Execute this SQL".
            // However, for "Classic Mode" we want a direct execution if possible.
            // Looking at the backend code, there isn't a direct "execute raw sql" endpoint for the frontend.
            // We will use the agent stream with a system prompt or user message to execute SQL.
            // OR, we can use the existing /api/query/execute endpoint if it exists? 
            // Checking backend... QueryController has execute_query but it's used by the agent tool.
            // Let's use the chat endpoint for now as it's the most reliable way without backend changes.

            const response = await fetch(`${API_URL}/api/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `Execute this SQL query directly and strictly return the results. Do not explain. SQL:\n\`\`\`sql\n${sql}\n\`\`\``
                    }],
                    connection_id: selectedDb,
                    conversation_id: null, // No conversation history for classic mode
                    use_deep_think: false
                })
            })

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.type === 'results') {
                                setResults(data.content)
                            } else if (data.type === 'error') {
                                setError(data.content)
                            }
                        } catch (e) {
                            console.error('Error parsing SSE:', e)
                        }
                    }
                }
            }

            // Refresh quota after query
            refreshQuota()

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`flex h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`} style={{ height: 'calc(100vh - 80px)' }}>
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                SQL Runner
                            </h2>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Execute raw SQL queries directly
                            </p>
                        </div>

                        {/* DB Selector */}
                        <div className="relative w-64">
                            <button
                                onClick={() => setShowDbSelector(!showDbSelector)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    <span className="text-sm truncate">
                                        {databases?.find(db => db.id === selectedDb)?.name || 'Select Database'}
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {showDbSelector && (
                                <div className={`absolute top-full right-0 mt-1 w-full rounded-lg border shadow-lg z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                    }`}>
                                    <div className="max-h-60 overflow-y-auto">
                                        {databases?.map(db => (
                                            <button
                                                key={db.id}
                                                onClick={() => {
                                                    setSelectedDb(db.id)
                                                    setShowDbSelector(false)
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-opacity-10 ${db.id === selectedDb
                                                    ? darkMode ? 'bg-blue-600 bg-opacity-20 text-white' : 'bg-blue-50 text-blue-700'
                                                    : darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-50 text-gray-700'
                                                    }`}
                                            >
                                                <div className="font-medium">{db.name}</div>
                                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {db.type} • {db.database}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="space-y-3">
                        <div className={`relative rounded-lg border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                            <textarea
                                value={sql}
                                onChange={(e) => setSql(e.target.value)}
                                placeholder="SELECT * FROM users LIMIT 10;"
                                className={`w-full h-32 p-4 font-mono text-sm resize-none focus:outline-none ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-white text-gray-800'
                                    }`}
                            />
                            <div className={`absolute bottom-3 right-3`}>
                                <button
                                    onClick={handleRunQuery}
                                    disabled={loading || !sql.trim() || !selectedDb}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${loading || !sql.trim() || !selectedDb
                                        ? darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                        }`}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    Run Query
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                            <h3 className="font-semibold mb-1">Error Executing Query</h3>
                            <pre className="text-sm whitespace-pre-wrap">{error}</pre>
                        </div>
                    )}

                    {results && (
                        <ResultsDisplay
                            results={results}
                            sql={sql}
                            darkMode={darkMode}
                            onRunQuery={(newSql) => {
                                setSql(newSql)
                                handleRunQuery()
                            }}
                            connectionId={selectedDb}
                        />
                    )}
                </div>
            </div>

            {/* Schema Sidebar */}
            <div className={`w-64 border-l overflow-y-auto p-4 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'
                }`}>
                <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>
                    <Database className="w-4 h-4" />
                    Schema
                </h3>
                <SchemaViewer connectionId={selectedDb} darkMode={darkMode} />
            </div>
        </div>
    )
}
