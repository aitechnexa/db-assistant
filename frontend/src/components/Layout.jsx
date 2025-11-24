import React, { useState, useEffect } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { Moon, Sun, LogOut, Menu, X, Database, MessageSquare, BarChart3, Crown } from 'lucide-react'
import QuotaIndicator from '../components/QuotaIndicator'
import { useQuota } from '../context/QuotaContext'

export default function Layout({ darkMode, setDarkMode }) {
    const [user, setUser] = useState(null)
    const { quotaInfo } = useQuota()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            setUser(JSON.parse(userData))
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/auth')
    }

    const navItems = [
        { name: 'Chat Mode', path: '/chat', icon: MessageSquare },
        { name: 'Classic Mode', path: '/classic', icon: BarChart3 },
        { name: 'Databases', path: '/databases', icon: Database },
        ...(user?.is_admin ? [{ name: 'Admin', path: '/admin', icon: Crown }] : [])
    ]

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <header className={`sticky top-0 z-40 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        {/* Logo - Far Left */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                                <Database className="w-5 h-5 text-white" />
                            </div>
                            <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                DB Assistant
                            </h1>
                        </div>

                        {/* Desktop Nav - Center */}
                        <nav className="hidden md:flex items-center gap-1 mx-6">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = window.location.pathname.startsWith(item.path)
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isActive
                                            ? 'bg-blue-500 text-white'
                                            : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.name}
                                    </button>
                                )
                            })}
                        </nav>

                        {/* Spacer to push right items to the end */}
                        <div className="flex-1"></div>

                        {/* Right side - Far Right */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Quota */}
                            {quotaInfo && (
                                <div className="hidden sm:block">
                                    <QuotaIndicator darkMode={darkMode} quotaInfo={quotaInfo} />
                                </div>
                            )}

                            {/* Dark mode toggle */}
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            >
                                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
                            </button>

                            {/* User menu */}
                            {user && (
                                <button
                                    onClick={handleLogout}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            )}

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className={`md:hidden p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className={`md:hidden border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                        <div className="px-4 py-3 space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = window.location.pathname.startsWith(item.path)
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            navigate(item.path)
                                            setMobileMenuOpen(false)
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${isActive
                                            ? 'bg-blue-500 text-white'
                                            : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.name}
                                    </button>
                                )
                            })}

                            {quotaInfo && (
                                <div className="pt-2">
                                    <QuotaIndicator darkMode={darkMode} quotaInfo={quotaInfo} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Main content */}
            <main>
                <Outlet />
            </main>
        </div>
    )
}
