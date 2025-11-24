import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Database, Plus, Trash2, Edit2, Check, X, Loader2, Server, Shield, AlertCircle, Zap } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

// Default ports for different database types
const DEFAULT_PORTS = {
    postgresql: 5432,
    mysql: 3306,
    sqlite: null
}

export default function DatabasesPage({ darkMode }) {
    const [databases, setDatabases] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [testStatus, setTestStatus] = useState(null) // 'testing', 'success', 'error', null
    const [testMessage, setTestMessage] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        type: 'postgresql',
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        fetchDatabases()
    }, [])

    const fetchDatabases = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                navigate('/auth')
                return
            }

            const response = await axios.get(`${API_URL}/api/databases`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setDatabases(response.data)
        } catch (error) {
            console.error('Failed to fetch databases:', error)
            if (error.response?.status === 401) {
                navigate('/auth')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target

        // Auto-select port when database type changes
        if (name === 'type') {
            const defaultPort = DEFAULT_PORTS[value]
            setFormData(prev => ({
                ...prev,
                type: value,
                port: defaultPort || ''
            }))
            // Clear test status when changing database type
            setTestStatus(null)
            setTestMessage('')
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'port' ? parseInt(value) || '' : value
            }))
            // Clear test status when changing any field
            if (testStatus) {
                setTestStatus(null)
                setTestMessage('')
            }
        }
    }

    const handleTestConnection = async () => {
        setIsTesting(true)
        setTestStatus('testing')
        setTestMessage('')
        setError('')

        try {
            const response = await axios.post(`${API_URL}/api/databases/test`, formData)

            if (response.data.success) {
                setTestStatus('success')
                setTestMessage('Connection successful! You can now save this database.')
            } else {
                setTestStatus('error')
                setTestMessage(response.data.message || 'Connection failed. Please check your credentials.')
            }
        } catch (error) {
            console.error('Failed to test connection:', error)
            setTestStatus('error')
            setTestMessage(error.response?.data?.detail || error.response?.data?.message || 'Failed to test connection. Please check your credentials and try again.')
        } finally {
            setIsTesting(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError('')
        setSuccess('')

        try {
            const token = localStorage.getItem('token')
            await axios.post(`${API_URL}/api/databases`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setSuccess('Database added successfully!')
            setIsAdding(false)
            setFormData({
                name: '',
                type: 'postgresql',
                host: '',
                port: 5432,
                database: '',
                username: '',
                password: ''
            })
            // Reset test status
            setTestStatus(null)
            setTestMessage('')
            fetchDatabases()
        } catch (error) {
            console.error('Failed to add database:', error)
            setError(error.response?.data?.detail || 'Failed to add database. Please check your credentials.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this database connection?')) return

        try {
            const token = localStorage.getItem('token')
            await axios.delete(`${API_URL}/api/databases/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            fetchDatabases()
        } catch (error) {
            console.error('Failed to delete database:', error)
            alert('Failed to delete database')
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Database Connections
                    </h1>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Manage your database connections for querying
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${isAdding
                        ? darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                >
                    {isAdding ? (
                        <>
                            <X className="w-4 h-4" /> Cancel
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" /> Add Database
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <p className="text-red-500 text-sm">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5" />
                    <p className="text-green-500 text-sm">{success}</p>
                </div>
            )}

            {isAdding && (
                <div className={`mb-8 p-6 rounded-xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        New Connection Details
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Connection Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="My Production DB"
                                    required
                                    className={`w-full px-3 py-2 rounded-lg border ${darkMode
                                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Database Type
                                </label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 rounded-lg border ${darkMode
                                        ? 'bg-gray-900 border-gray-700 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                >
                                    <option value="postgresql">PostgreSQL</option>
                                    <option value="mysql">MySQL</option>
                                    <option value="sqlite">SQLite</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Host
                                </label>
                                <input
                                    type="text"
                                    name="host"
                                    value={formData.host}
                                    onChange={handleInputChange}
                                    placeholder="localhost"
                                    required={formData.type !== 'sqlite'}
                                    disabled={formData.type === 'sqlite'}
                                    className={`w-full px-3 py-2 rounded-lg border ${darkMode
                                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Port
                                </label>
                                <input
                                    type="number"
                                    name="port"
                                    value={formData.port}
                                    onChange={handleInputChange}
                                    placeholder="5432"
                                    required={formData.type !== 'sqlite'}
                                    disabled={formData.type === 'sqlite'}
                                    className={`w-full px-3 py-2 rounded-lg border ${darkMode
                                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Database Name
                                </label>
                                <input
                                    type="text"
                                    name="database"
                                    value={formData.database}
                                    onChange={handleInputChange}
                                    placeholder="postgres"
                                    required
                                    className={`w-full px-3 py-2 rounded-lg border ${darkMode
                                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="postgres"
                                    required={formData.type !== 'sqlite'}
                                    disabled={formData.type === 'sqlite'}
                                    className={`w-full px-3 py-2 rounded-lg border ${darkMode
                                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    disabled={formData.type === 'sqlite'}
                                    className={`w-full px-3 py-2 rounded-lg border ${darkMode
                                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                                />
                            </div>
                        </div>

                        {/* Test Connection Section */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            {testStatus && (
                                <div className={`mb-4 p-4 rounded-lg border ${testStatus === 'success'
                                    ? 'bg-green-500/10 border-green-500/20'
                                    : testStatus === 'error'
                                        ? 'bg-red-500/10 border-red-500/20'
                                        : 'bg-blue-500/10 border-blue-500/20'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {testStatus === 'testing' && (
                                            <Loader2 className="w-5 h-5 text-blue-500 mt-0.5 animate-spin" />
                                        )}
                                        {testStatus === 'success' && (
                                            <Check className="w-5 h-5 text-green-500 mt-0.5" />
                                        )}
                                        {testStatus === 'error' && (
                                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                        )}
                                        <p className={`text-sm flex-1 ${testStatus === 'success'
                                            ? 'text-green-500'
                                            : testStatus === 'error'
                                                ? 'text-red-500'
                                                : 'text-blue-500'
                                            }`}>
                                            {testMessage || 'Testing connection...'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={isTesting || !formData.host || !formData.database || (formData.type !== 'sqlite' && (!formData.username))}
                                    className={`px-6 py-2 border rounded-lg font-medium flex items-center gap-2 ${isTesting
                                        ? 'opacity-50 cursor-not-allowed'
                                        : testStatus === 'success'
                                            ? darkMode
                                                ? 'border-green-600 text-green-400 hover:bg-green-900/20'
                                                : 'border-green-600 text-green-600 hover:bg-green-50'
                                            : testStatus === 'error'
                                                ? darkMode
                                                    ? 'border-orange-600 text-orange-400 hover:bg-orange-900/20'
                                                    : 'border-orange-600 text-orange-600 hover:bg-orange-50'
                                                : darkMode
                                                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {isTesting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Testing...
                                        </>
                                    ) : testStatus === 'success' ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Connection OK
                                        </>
                                    ) : testStatus === 'error' ? (
                                        <>
                                            <AlertCircle className="w-4 h-4" />
                                            Test Again
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Test Connection
                                        </>
                                    )}
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || testStatus !== 'success'}
                                    className={`px-6 py-2 bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 ${isSubmitting || testStatus !== 'success'
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-blue-600'
                                        }`}
                                    title={testStatus !== 'success' ? 'Please test the connection first' : ''}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {isSubmitting ? 'Connecting...' : 'Connect Database'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                </div>
            ) : databases.length === 0 && !isAdding ? (
                <div className={`text-center py-12 border-2 border-dashed rounded-xl ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <Database className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        No databases connected
                    </h3>
                    <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Connect a database to start querying your data
                    </p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                    >
                        Add Your First Database
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {databases.map(db => (
                        <div
                            key={db.id}
                            className={`p-5 rounded-xl border transition-all ${darkMode
                                ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                                    <Database className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDelete(db.id)}
                                        className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {db.name}
                            </h3>
                            <div className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Server className="w-3 h-3" />
                                    {db.host}:{db.port}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    {db.database}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {db.type}
                                </span>
                                <span className="flex-1 text-right text-xs text-green-500 flex items-center justify-end gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Active
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
