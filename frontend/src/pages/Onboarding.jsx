import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ChevronRight, Database, MessageSquare, Check } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'

export default function Onboarding({ darkMode }) {
    const [step, setStep] = useState(0)
    const [completed, setCompleted] = useState(false)
    const navigate = useNavigate()

    const steps = [
        {
            title: 'Welcome to DB Assistant!',
            description: 'Query your databases using natural language. Let\'s get you started.',
            icon: '👋'
        },
        {
            title: 'Connect Your Database',
            description: 'Add your first database connection to start querying.',
            action: 'Add Database',
            icon: '🗄️'
        },
        {
            title: 'You\'re All Set!',
            description: 'Start asking questions about your data in natural language.',
            icon: '🎉'
        }
    ]

    const handleNext = () => {
        if (step === 1) {
            // Skip to database page to add connection
            navigate('/databases')
            return
        }

        if (step === steps.length - 1) {
            navigate('/chat')
        } else {
            setStep(step + 1)
        }
    }

    const handleSkip = () => {
        navigate('/chat')
    }

    const currentStep = steps[step]

    return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
            <div className={`max-w-2xl w-full mx-4 p-12 rounded-2xl shadow-2xl text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                {/* Progress */}
                <div className="flex justify-center gap-2 mb-8">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all ${idx === step ? 'w-12 bg-blue-500' : idx < step ? 'w-8 bg-blue-400' : 'w-8 bg-gray-300'
                                }`}
                        />
                    ))}
                </div>

                {/* Icon */}
                <div className="text-6xl mb-6">{currentStep.icon}</div>

                {/* Content */}
                <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentStep.title}
                </h2>
                <p className={`text-lg mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {currentStep.description}
                </p>

                {/* Example queries (on first step) */}
                {step === 0 && (
                    <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Example queries you can ask:
                        </p>
                        <div className="space-y-2 text-left">
                            {[
                                'Show me all customers from California',
                                'What are the top 10 products by revenue?',
                                'How many orders were placed last month?'
                            ].map((query, idx) => (
                                <div key={idx} className={`flex items-start gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                                    <span>{query}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tier info (on last step) */}
                {step === 2 && (
                    <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                        <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                            Your Free Tier Includes:
                        </p>
                        <div className="flex items-center justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>1 Database</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>10 Queries/Day</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleSkip}
                        className={`px-6 py-3 rounded-lg font-medium ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"
                    >
                        {currentStep.action || (step === steps.length - 1 ? 'Get Started' : 'Next')}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
