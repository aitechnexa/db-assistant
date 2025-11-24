import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedAdminRoute({ children }) {
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    if (!user || !user.is_admin) {
        return <Navigate to="/chat" replace />
    }

    return children
}
