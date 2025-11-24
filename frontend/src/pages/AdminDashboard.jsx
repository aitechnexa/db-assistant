import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Users, TrendingUp, Database, DollarSign, Crown, AlertCircle, CheckCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function AdminDashboard({ darkMode }) {
    const [activeTab, setActiveTab] = useState('analytics')
    const [analytics, setAnalytics] = useState(null)
    const [users, setUsers] = useState([])
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedTierFilter, setSelectedTierFilter] = useState('all')
    const [upgradeModal, setUpgradeModal] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const headers = { Authorization: `Bearer ${token}` }

            const [analyticsRes, usersRes, paymentsRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/analytics`, { headers }),
                axios.get(`${API_URL}/api/admin/users`, { headers }),
                axios.get(`${API_URL}/api/admin/payments?limit=50`, { headers })
            ])

            setAnalytics(analyticsRes.data)
            setUsers(usersRes.data)
            setPayments(paymentsRes.data)
        } catch (error) {
            console.error('Failed to fetch admin data:', error)
            if (error.response?.status === 403) {
                alert('Access denied. Admin privileges required.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleUpgradeUser = async (userId, newTier, amount, notes) => {
        try {
            const token = localStorage.getItem('token')
            await axios.post(
                `${API_URL}/api/admin/users/${userId}/tier`,
                {
                    tier: newTier,
                    payment_amount: amount,
                    payment_method: 'manual',
                    notes
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            alert('User tier updated successfully!')
            setUpgradeModal(null)
            fetchData()
        } catch (error) {
            console.error('Failed to upgrade user:', error)
            alert('Failed to update user tier')
        }
    }

    const filteredUsers = selectedTierFilter === 'all'
        ? users
        : users.filter(u => u.subscription_tier === selectedTierFilter)

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading admin dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Crown className="w-8 h-8 text-yellow-500" />
                        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Admin Dashboard
                        </h1>
                    </div>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Manage users, monitor analytics, and track payments
                    </p>
                </div>

                {/* Analytics Cards */}
                {analytics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            icon={Users}
                            label="Total Users"
                            value={analytics.total_users}
                            subtext={`${analytics.active_users} active`}
                            darkMode={darkMode}
                            color="blue"
                        />
                        <StatCard
                            icon={Database}
                            label="Total Connections"
                            value={analytics.total_connections}
                            darkMode={darkMode}
                            color="green"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Total Queries"
                            value={analytics.total_queries.toLocaleString()}
                            darkMode={darkMode}
                            color="purple"
                        />
                        <StatCard
                            icon={DollarSign}
                            label="Pro Users"
                            value={analytics.tier_distribution.find(t => t.tier === 'pro')?.user_count || 0}
                            subtext={`${(analytics.tier_distribution.find(t => t.tier === 'pro')?.percentage || 0).toFixed(1)}%`}
                            darkMode={darkMode}
                            color="yellow"
                        />
                    </div>
                )}

                {/* Tabs */}
                <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
                    <div className="flex gap-4">
                        {['analytics', 'users', 'payments'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                                        ? 'border-blue-500 text-blue-500'
                                        : darkMode
                                            ? 'border-transparent text-gray-400 hover:text-gray-300'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'analytics' && analytics && (
                    <TierDistribution distribution={analytics.tier_distribution} darkMode={darkMode} />
                )}

                {activeTab === 'users' && (
                    <UsersTable
                        users={filteredUsers}
                        darkMode={darkMode}
                        selectedTierFilter={selectedTierFilter}
                        setSelectedTierFilter={setSelectedTierFilter}
                        onUpgrade={(user) => setUpgradeModal(user)}
                    />
                )}

                {activeTab === 'payments' && (
                    <PaymentsTable payments={payments} darkMode={darkMode} />
                )}

                {/* Upgrade Modal */}
                {upgradeModal && (
                    <UpgradeUserModal
                        user={upgradeModal}
                        darkMode={darkMode}
                        onClose={() => setUpgradeModal(null)}
                        onSubmit={handleUpgradeUser}
                    />
                )}
            </div>
        </div>
    )
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subtext, darkMode, color }) {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        yellow: 'from-yellow-500 to-yellow-600'
    }

    return (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${colors[color]}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
            <div className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {value}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {label}
            </div>
            {subtext && (
                <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {subtext}
                </div>
            )}
        </div>
    )
}

// Tier Distribution Chart
function TierDistribution({ distribution, darkMode }) {
    return (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                User Distribution by Tier
            </h3>
            <div className="space-y-4">
                {distribution.map(tier => (
                    <div key={tier.tier}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium capitalize ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {tier.tier}
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {tier.user_count} users ({tier.percentage}%)
                            </span>
                        </div>
                        <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                                className={`h-full ${tier.tier === 'pro' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' :
                                        tier.tier === 'basic' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                            'bg-gradient-to-r from-gray-500 to-gray-400'
                                    }`}
                                style={{ width: `${tier.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Users Table
function UsersTable({ users, darkMode, selectedTierFilter, setSelectedTierFilter, onUpgrade }) {
    return (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
                <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Users ({users.length})
                    </h3>
                    <select
                        value={selectedTierFilter}
                        onChange={(e) => setSelectedTierFilter(e.target.value)}
                        className={`px-3 py-1 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                    >
                        <option value="all">All Tiers</option>
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>User</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Tier</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Connections</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Queries</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Joined</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {users.map(user => (
                            <tr key={user.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                <td className="px-4 py-3">
                                    <div>
                                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {user.full_name}
                                        </div>
                                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {user.email}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.subscription_tier === 'pro' ? 'bg-purple-100 text-purple-700' :
                                            user.subscription_tier === 'basic' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {user.subscription_tier.toUpperCase()}
                                    </span>
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {user.connection_count}
                                </td>
                                <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {user.total_queries}
                                </td>
                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => onUpgrade(user)}
                                        className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                                    >
                                        Upgrade
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Payments Table
function PaymentsTable({ payments, darkMode }) {
    return (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Payments ({payments.length})
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Date</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>User</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Tier</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Amount</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Method</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>Status</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {payments.map(payment => (
                            <tr key={payment.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {payment.user_name}
                                    </div>
                                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {payment.user_email}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                        {payment.tier.toUpperCase()}
                                    </span>
                                </td>
                                <td className={`px-4 py-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    ${payment.amount.toFixed(2)}
                                </td>
                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {payment.payment_method || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`flex items-center gap-1 text-sm ${payment.status === 'completed' ? 'text-green-500' :
                                            payment.status === 'failed' ? 'text-red-500' :
                                                'text-yellow-500'
                                        }`}>
                                        {payment.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {payment.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Upgrade Modal
function UpgradeUserModal({ user, darkMode, onClose, onSubmit }) {
    const [tier, setTier] = useState('basic')
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')

    const handleSubmit = () => {
        onSubmit(user.id, tier, parseFloat(amount) || 0, notes)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4`}>
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Upgrade User
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            User: {user.full_name}
                        </label>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Current tier: {user.subscription_tier}
                        </div>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            New Tier
                        </label>
                        <select
                            value={tier}
                            onChange={(e) => setTier(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                        >
                            <option value="free">Free</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Payment Amount ($)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows="3"
                            placeholder="Optional notes..."
                            className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className={`flex-1 px-4 py-2 rounded-lg border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium"
                    >
                        Upgrade User
                    </button>
                </div>
            </div>
        </div>
    )
}
