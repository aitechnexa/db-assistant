import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import SqlRunner from '../components/SqlRunner'
import { Database, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function ClassicModePage({ darkMode }) {
    const [databases, setDatabases] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchDatabases()
    }, [])

    const fetchDatabases = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_URL}/api/databases/`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setDatabases(response.data)
        } catch (error) {
            console.error('Failed to fetch databases:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (databases.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                    <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2 dark:text-white">No Databases Connected</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                    You need to connect a database before you can run SQL queries.
                </p>
                <button
                    onClick={() => navigate('/databases')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    Connect Database
                </button>
            </div>
        )
    }

    return (
        <SqlRunner
            darkMode={darkMode}
            databases={databases}
            onSelectDatabase={() => { }} // Handled internally by SqlRunner for now
            onAddDatabase={() => navigate('/databases')}
        />
    )
}
