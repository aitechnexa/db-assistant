import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AgenticChatbot from '../AgenticChatbot'
import UpgradeModal from '../components/UpgradeModal'
import axios from 'axios'
import { useQuota } from '../context/QuotaContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function ChatModePage({ darkMode }) {
    const [databases, setDatabases] = useState([])
    const [selectedDb, setSelectedDb] = useState(null)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const { quotaInfo, refreshQuota } = useQuota()
    const navigate = useNavigate()

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            navigate('/auth')
            return
        }

        fetchDatabases()
    }, [])

    const fetchDatabases = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${API_URL}/api/databases`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setDatabases(response.data)
            if (response.data.length > 0) {
                setSelectedDb(response.data[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch databases:', error)
            if (error.response?.status === 401) {
                navigate('/auth')
            }
        }
    }

    // Listen for quota exceeded errors (handled globally in context, but modal trigger here?)
    // Actually, QuotaContext intercepts 429 but doesn't trigger modal.
    // We can add a listener or check quotaInfo.
    // For now, let's keep the interceptor here for the modal or move modal to Layout?
    // Moving modal to Layout would be better for global access, but let's keep it here for now to minimize changes.
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 429) {
                    setShowUpgradeModal(true)
                }
                return Promise.reject(error)
            }
        )

        return () => axios.interceptors.response.eject(interceptor)
    }, [])

    return (
        <div className="h-full flex flex-col">
            {databases.length === 0 ? (
                <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <p className="text-lg mb-4">No databases connected yet.</p>
                    <button
                        onClick={() => navigate('/databases')}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                    >
                        Add Your First Database
                    </button>
                </div>
            ) : (
                <AgenticChatbot
                    connectionId={selectedDb}
                    darkMode={darkMode}
                    databases={databases}
                    onSelectDatabase={setSelectedDb}
                    onAddDatabase={() => navigate('/databases')}
                />
            )}

            {showUpgradeModal && (
                <UpgradeModal
                    darkMode={darkMode}
                    onClose={() => setShowUpgradeModal(false)}
                    quotaInfo={quotaInfo}
                />
            )}
        </div>
    )
}
