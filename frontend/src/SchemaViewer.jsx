import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Database, ChevronRight, ChevronDown, Table, Columns, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function SchemaViewer({ connectionId, darkMode }) {
    const [schema, setSchema] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [expandedTables, setExpandedTables] = useState({})

    useEffect(() => {
        if (connectionId) {
            fetchSchema()
        }
    }, [connectionId])

    const fetchSchema = async () => {
        setLoading(true)
        setError(null)
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_URL}/api/databases/${connectionId}/schema`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setSchema(response.data)
            // Expand all tables by default if there are few, otherwise collapse
            const initialExpanded = {}
            Object.keys(response.data).forEach(table => {
                initialExpanded[table] = false
            })
            setExpandedTables(initialExpanded)
        } catch (err) {
            console.error('Error fetching schema:', err)
            setError('Failed to load schema')
        } finally {
            setLoading(false)
        }
    }

    const toggleTable = (tableName) => {
        setExpandedTables(prev => ({
            ...prev,
            [tableName]: !prev[tableName]
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className={`w-6 h-6 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
        )
    }

    if (error) {
        return (
            <div className={`p-4 rounded-lg text-sm ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                {error}
            </div>
        )
    }

    if (!schema || Object.keys(schema).length === 0) {
        return (
            <div className={`text-center p-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No schema information available
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {Object.entries(schema).map(([tableName, columns]) => (
                <div key={tableName} className="rounded-lg overflow-hidden">
                    <button
                        onClick={() => toggleTable(tableName)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${darkMode
                                ? 'text-gray-300 hover:bg-gray-800'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {expandedTables[tableName] ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <Table className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className="truncate">{tableName}</span>
                        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {columns.length}
                        </span>
                    </button>

                    {expandedTables[tableName] && (
                        <div className={`pl-9 pr-3 pb-2 space-y-1 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
                            {columns.map((col, idx) => (
                                <div key={idx} className={`flex items-center justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <div className="flex items-center gap-2 truncate">
                                        <Columns className="w-3 h-3 opacity-50" />
                                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{col.name}</span>
                                    </div>
                                    <span className="opacity-70 font-mono text-[10px]">{col.type}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
