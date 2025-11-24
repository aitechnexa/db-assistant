import React from 'react'
import { X, Zap, Crown, Rocket } from 'lucide-react'

export default function UpgradeModal({ darkMode, onClose, quotaInfo }) {
    const tiers = [
        {
            name: 'FREE',
            icon: Zap,
            price: '$0',
            features: ['1 Database Connection', '10 Queries per day', 'Basic Support'],
            current: quotaInfo?.subscription_tier === 'free'
        },
        {
            name: 'BASIC',
            icon: Crown,
            price: '$9/mo',
            features: ['5 Database Connections', '100 Queries per day', 'Priority Support', 'Export to CSV/Excel'],
            recommended: true
        },
        {
            name: 'PRO',
            icon: Rocket,
            price: '$29/mo',
            features: ['Unlimited Connections', 'Unlimited Queries', 'Premium Support', 'Advanced Analytics', 'API Access'],
        }
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-4xl w-full rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} relative max-h-[90vh] overflow-y-auto`}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="p-8 pb-6">
                    <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                        Upgrade Your Plan
                    </h2>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        You've reached your daily query limit. Upgrade to continue querying your databases.
                    </p>
                </div>

                {/* Pricing tiers */}
                <div className="px-8 pb-8 grid md:grid-cols-3 gap-4">
                    {tiers.map((tier) => {
                        const Icon = tier.icon
                        return (
                            <div
                                key={tier.name}
                                className={`relative p-6 rounded-xl border-2 transition-all ${tier.current
                                        ? darkMode ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                                        : tier.recommended
                                            ? darkMode ? 'border-purple-500 bg-purple-500/10' : 'border-purple-500 bg-purple-50'
                                            : darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
                                    }`}
                            >
                                {tier.recommended && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        RECOMMENDED
                                    </span>
                                )}

                                {tier.current && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        CURRENT PLAN
                                    </span>
                                )}

                                <div className="text-center mb-4">
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${tier.current ? 'bg-blue-500' : tier.recommended ? 'bg-purple-500' : darkMode ? 'bg-gray-700' : 'bg-gray-300'
                                        }`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                                        {tier.name}
                                    </h3>
                                    <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {tier.price}
                                    </div>
                                </div>

                                <ul className="space-y-3 mb-6">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {!tier.current && (
                                    <button className={`w-full py-2.5 rounded-lg font-medium transition-colors ${tier.recommended
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                                            : darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                                        }`}>
                                        Contact Admin
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Contact info */}
                <div className={`px-8 pb-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <p className="text-sm">
                        Contact your administrator to upgrade your subscription tier
                    </p>
                </div>
            </div>
        </div>
    )
}
