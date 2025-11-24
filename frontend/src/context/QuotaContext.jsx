import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const QuotaContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export function QuotaProvider({ children }) {
    const [quotaInfo, setQuotaInfo] = useState(null)
    const [loading, setLoading] = useState(false)

    const fetchQuota = useCallback(async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) return

            // Don't set loading true here to avoid UI flickering on background updates
            const response = await axios.get(`${API_URL}/api/query/quota`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setQuotaInfo(response.data)
        } catch (error) {
            console.error('Failed to fetch quota:', error)
        }
    }, [])

    // Initial fetch
    useEffect(() => {
        fetchQuota()
    }, [fetchQuota])

    // Listen for quota exceeded errors globally
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 429) {
                    // Refresh quota info to show 0/limit
                    fetchQuota()
                }
                return Promise.reject(error)
            }
        )

        return () => axios.interceptors.response.eject(interceptor)
    }, [fetchQuota])

    return (
        <QuotaContext.Provider value={{ quotaInfo, refreshQuota: fetchQuota, loading }}>
            {children}
        </QuotaContext.Provider>
    )
}

export function useQuota() {
    const context = useContext(QuotaContext)
    if (!context) {
        throw new Error('useQuota must be used within a QuotaProvider')
    }
    return context
}
