import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { User, Mail, Lock, AlertCircle, Database } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function Auth({ darkMode }) {
    const [isLogin, setIsLogin] = useState(true)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                // Login
                const response = await axios.post(`${API_URL}/api/auth/login`, {
                    username: formData.email,
                    password: formData.password
                })

                localStorage.setItem('token', response.data.access_token)
                localStorage.setItem('user', JSON.stringify(response.data.user))
                navigate('/chat')
            } else {
                // Register
                const response = await axios.post(`${API_URL}/api/auth/register`, {
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.full_name
                })

                // Auto-login after registration
                const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
                    username: formData.email,
                    password: formData.password
                })

                localStorage.setItem('token', loginResponse.data.access_token)
                localStorage.setItem('user', JSON.stringify(loginResponse.data.user))
                navigate('/onboarding')
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
            <div className={`max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
                        <Database className="w-8 h-8 text-white" />
                    </div>
                    <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        DB Assistant
                    </h1>
                    <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Natural language database queries
                    </p>
                </div>

                {/* Toggle */}
                <div className={`flex mb-6 p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2 rounded-md font-medium transition-all ${isLogin
                                ? 'bg-blue-500 text-white shadow-md'
                                : darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2 rounded-md font-medium transition-all ${!isLogin
                                ? 'bg-blue-500 text-white shadow-md'
                                : darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Full Name
                            </label>
                            <div className="relative">
                                <User className={`absolute left-3 top-3 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Email
                        </label>
                        <div className="relative">
                            <Mail className={`absolute left-3 top-3 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Password
                        </label>
                        <div className="relative">
                            <Lock className={`absolute left-3 top-3 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
                    </button>
                </form>

                {!isLogin && (
                    <p className={`mt-4 text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Free tier: 1 database connection • 10 queries/day
                    </p>
                )}
            </div>
        </div>
    )
}
