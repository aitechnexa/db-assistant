import React, { useState, useEffect } from 'react'
import {
    Database, Code, Check, Copy, Play, Loader2,
    BarChart3, TrendingUp, AreaChart, PieChart, ScatterChart, Lightbulb, Table as TableIcon
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, Pie, Scatter, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart as RePieChart, ScatterChart as ReScatterChart } from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5010'
const chartPalette = ['#2563eb', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#6366f1', '#ef4444', '#eab308']

// Utility function to build chart config
const getNumericValue = (value) => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.-]/g, '')
        const parsed = parseFloat(cleaned)
        return Number.isNaN(parsed) ? null : parsed
    }
    return null
}

const buildChartConfig = (rows = [], columns = []) => {
    // Limit to first 100 rows for performance
    const displayRows = rows.slice(0, 100)
    if (!rows.length || !columns.length) return null

    const numericCols = columns.filter((col) => rows.some((row) => getNumericValue(row[col]) !== null))
    if (!numericCols.length) return null

    const labelColumn = columns.find((col) => col !== numericCols[0]) || columns[0]

    const chartData = displayRows.map((row, idx) => {
        const point = {}
        const labelValue = row[labelColumn]

        point[labelColumn] =
            (typeof labelValue === 'string' && labelValue.trim().length > 0) || typeof labelValue === 'number'
                ? labelValue
                : `Row ${idx + 1}`

        numericCols.forEach((col) => {
            const value = getNumericValue(row[col])
            if (value !== null) {
                point[col] = value
            }
        })

        return point
    })
        .filter((point) => numericCols.some((col) => col in point))

    if (!chartData.length) return null

    return {
        data: chartData,
        xKey: labelColumn,
        yKeys: numericCols
    }
}

export default function ResultsDisplay({ results, summary, sql, darkMode, onRunQuery, connectionId }) {
    const [showChart, setShowChart] = useState(true)
    const [copiedSQL, setCopiedSQL] = useState(false)
    const [editableSQL, setEditableSQL] = useState(sql)
    const [isEditingSQL, setIsEditingSQL] = useState(false)
    const [chartType, setChartType] = useState('bar') // bar, line, area, pie, scatter
    const [xAxis, setXAxis] = useState('')
    const [yAxis, setYAxis] = useState('')
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        setEditableSQL(sql)
    }, [sql])

    const chartConfig = React.useMemo(() => buildChartConfig(results?.data, results?.columns), [results])

    useEffect(() => {
        if (chartConfig) {
            setXAxis(chartConfig.xKey)
            setYAxis(chartConfig.yKeys[0])
        }
    }, [chartConfig])

    const handleCopySQL = () => {
        navigator.clipboard.writeText(editableSQL)
        setCopiedSQL(true)
        setTimeout(() => setCopiedSQL(false), 2000)
    }

    const handleRunQuery = () => {
        onRunQuery(editableSQL)
        setIsEditingSQL(false)
    }

    const handleDownloadCSV = async () => {
        if (!sql || !connectionId) return

        setIsExporting(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/export/query/csv`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    database_id: connectionId,
                    sql_query: sql,
                    filename: `query_results_${new Date().getTime()}`
                })
            })

            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `query_results_${new Date().getTime()}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Export error:', error)
            alert('Failed to download CSV. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    if (!results || !results.data || results.data.length === 0) {
        return (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-8 text-center`}>
                <Database className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No results to display yet</p>
            </div>
        )
    }

    const renderChart = () => {
        if (!chartConfig) return null

        const CommonProps = {
            data: chartConfig.data,
            margin: { top: 10, right: 30, left: 0, bottom: 0 }
        }

        const AxisProps = {
            stroke: darkMode ? '#9ca3af' : '#6b7280',
            tick: { fill: darkMode ? '#9ca3af' : '#6b7280' }
        }

        switch (chartType) {
            case 'line':
                return (
                    <ComposedChart {...CommonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis dataKey={xAxis} {...AxisProps} />
                        <YAxis {...AxisProps} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#f3f4f6' : '#1f2937' }} />
                        <Legend />
                        <Line type="monotone" dataKey={yAxis} stroke={chartPalette[0]} strokeWidth={2} />
                    </ComposedChart>
                )
            case 'area':
                return (
                    <ComposedChart {...CommonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis dataKey={xAxis} {...AxisProps} />
                        <YAxis {...AxisProps} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#f3f4f6' : '#1f2937' }} />
                        <Legend />
                        <Area type="monotone" dataKey={yAxis} fill={chartPalette[0]} stroke={chartPalette[0]} fillOpacity={0.3} />
                    </ComposedChart>
                )
            case 'pie':
                return (
                    <RePieChart>
                        <Pie
                            data={chartConfig.data}
                            dataKey={yAxis}
                            nameKey={xAxis}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill={chartPalette[0]}
                            label
                        >
                            {chartConfig.data.map((entry, index) => (
                                <cell key={`cell-${index}`} fill={chartPalette[index % chartPalette.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#f3f4f6' : '#1f2937' }} />
                        <Legend />
                    </RePieChart>
                )
            case 'scatter':
                return (
                    <ReScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis type="category" dataKey={xAxis} name={xAxis} {...AxisProps} />
                        <YAxis type="number" dataKey={yAxis} name={yAxis} {...AxisProps} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#f3f4f6' : '#1f2937' }} />
                        <Legend />
                        <Scatter name={yAxis} data={chartConfig.data} fill={chartPalette[0]} />
                    </ReScatterChart>
                )
            default: // bar
                return (
                    <ComposedChart {...CommonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis dataKey={xAxis} {...AxisProps} />
                        <YAxis {...AxisProps} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#f3f4f6' : '#1f2937' }} />
                        <Legend />
                        <Bar dataKey={yAxis} fill={chartPalette[0]} radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                )
        }
    }

    return (
        <div className="space-y-4">
            {/* SQL Query Editor */}
            {sql && (
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Code className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>SQL Query</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditingSQL(!isEditingSQL)}
                                className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                            >
                                {isEditingSQL ? 'Cancel' : 'Edit'}
                            </button>
                            <button
                                onClick={handleCopySQL}
                                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                {copiedSQL ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                {copiedSQL ? 'Copied!' : 'Copy'}
                            </button>
                            {isEditingSQL && (
                                <button
                                    onClick={handleRunQuery}
                                    className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Play className="w-3 h-3" />
                                    Run
                                </button>
                            )}
                        </div>
                    </div>
                    {isEditingSQL ? (
                        <textarea
                            value={editableSQL}
                            onChange={(e) => setEditableSQL(e.target.value)}
                            className={`w-full h-32 p-3 rounded-lg font-mono text-sm ${darkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200'
                                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                    ) : (
                        <pre className={`${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'} p-3 rounded-lg overflow-x-auto text-sm`}>
                            <code>{sql}</code>
                        </pre>
                    )}
                </div>
            )}

            {/* Chart */}
            {chartConfig && showChart && (
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            <BarChart3 className="w-5 h-5" />
                            Visualization
                        </h3>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Chart Type Selector */}
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                {[
                                    { id: 'bar', icon: BarChart3 },
                                    { id: 'line', icon: TrendingUp },
                                    { id: 'area', icon: AreaChart },
                                    { id: 'pie', icon: PieChart },
                                    { id: 'scatter', icon: ScatterChart }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setChartType(type.id)}
                                        className={`p-1.5 rounded ${chartType === type.id
                                            ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                        title={type.id.charAt(0).toUpperCase() + type.id.slice(1)}
                                    >
                                        <type.icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>

                            {/* Axis Selectors */}
                            <select
                                value={xAxis}
                                onChange={(e) => setXAxis(e.target.value)}
                                className={`text-sm px-2 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'
                                    }`}
                            >
                                {(results.columns || []).map((col, idx) => (
                                    <option key={idx} value={col}>X: {col}</option>
                                ))}
                            </select>

                            <select
                                value={yAxis}
                                onChange={(e) => setYAxis(e.target.value)}
                                className={`text-sm px-2 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'
                                    }`}
                            >
                                {chartConfig.yKeys.map((col, idx) => (
                                    <option key={idx} value={col}>Y: {col}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            )}

            {/* Summary/Insights */}
            {summary && (
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Insights & Summary</h3>
                    </div>
                    <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-3 text-sm leading-relaxed`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h3: ({ node, ...props }) => <h3 className="font-semibold text-base mb-2 mt-4" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 ml-2" {...props} />,
                                li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />
                            }}
                        >
                            {summary}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        <TableIcon className="w-5 h-5" />
                        Query Results ({results.data.length} rows)
                    </h3>
                    <button
                        onClick={handleDownloadCSV}
                        disabled={isExporting}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-50 hover:bg-blue-600 text-white'
                            } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        )}
                        {isExporting ? 'Exporting...' : 'Download CSV'}
                    </button>
                </div>
                <div className="overflow-x-auto w-full block">
                    <table className="min-w-full text-sm table-auto">
                        <thead>
                            <tr className={darkMode ? 'bg-gray-900' : 'bg-gray-50'}>
                                {(results.columns || []).map((col, idx) => (
                                    <th key={idx} className={`px-4 py-2 text-left font-medium whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {results.data.slice(0, 50).map((row, idx) => (
                                <tr key={idx} className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                    {(results.columns || []).map((col, colIdx) => (
                                        <td key={colIdx} className={`px-4 py-2 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {results.data.length > 50 && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Showing first 50 of {results.data.length} rows
                    </p>
                )}
            </div>
        </div>
    )
}
