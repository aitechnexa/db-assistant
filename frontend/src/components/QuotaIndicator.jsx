import React from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'

export default function QuotaIndicator({ darkMode, quotaInfo }) {
    if (!quotaInfo) return null

    const { queries_used = 0, daily_limit = 10, subscription_tier = 'free' } = quotaInfo
    const isUnlimited = daily_limit === -1
    const percentage = isUnlimited ? 0 : (queries_used / daily_limit) * 100
    const remaining = isUnlimited ? '∞' : Math.max(0, daily_limit - queries_used)

    const getColor = () => {
        if (isUnlimited) return 'from-green-500 to-emerald-500'
        if (percentage >= 100) return 'from-red-500 to-rose-500'
        if (percentage >= 80) return 'from-orange-500 to-amber-500'
        return 'from-blue-500 to-indigo-500'
    }

    const getTierBadge = () => {
        const colors = {
            free: 'bg-gray-500',
            basic: 'bg-blue-500',
            pro: 'bg-purple-500'
        }
        return colors[subscription_tier] || 'bg-gray-500'
    }

    return (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Tier Badge */}
            <span className={`${getTierBadge()} text-white text-xs font-bold px-2 py-1 rounded uppercase`}>
                {subscription_tier}
            </span>

            {/* Progress section */}
            <div className="flex-1 min-w-[120px]">
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Queries Today
                    </span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {isUnlimited ? `${queries_used} used` : `${remaining} left`}
                    </span>
                </div>

                {!isUnlimited && (
                    <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                            className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-300`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    </div>
                )}

                {isUnlimited && (
                    <div className="flex items-center gap-1 text-green-500">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs font-medium">Unlimited</span>
                    </div>
                )}
            </div>

            {/* Warning */}
            {!isUnlimited && percentage >= 80 && percentage < 100 && (
                <AlertCircle className="w-4 h-4 text-orange-500" />
            )}
            {!isUnlimited && percentage >= 100 && (
                <AlertCircle className="w-4 h-4 text-red-500" />
            )}
        </div>
    )
}
