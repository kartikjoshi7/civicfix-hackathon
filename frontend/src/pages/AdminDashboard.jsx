import React, { useState, useEffect } from 'react'
import { getAllReports, getDashboardStats, updateReportStatus } from '../services/api'
import { FiRefreshCw, FiFilter, FiDownload, FiAlertTriangle } from 'react-icons/fi'

const AdminDashboard = () => {
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({
    total_reports: 0,
    today_reports: 0,
    reports_by_type: {},
    reports_by_severity: { high: 0, medium: 0, low: 0 },
    avg_severity_score: 0
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    fetchData()
  }, [filters])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [reportsData, statsData] = await Promise.all([
        getAllReports(filters),
        getDashboardStats()
      ])
      
      setReports(reportsData.reports || [])
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      await updateReportStatus(reportId, newStatus)
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleFilterChange = (status) => {
    setSelectedStatus(status)
    setFilters(status ? { status } : {})
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'OPEN': return 'bg-red-100 text-red-800 border-red-300'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-300'
      case 'REJECTED': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSeverityColor = (score) => {
    if (score >= 7) return 'bg-red-100 text-red-800 border-red-300'
    if (score >= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-green-100 text-green-800 border-green-300'
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportToCSV = () => {
    // Simple CSV export
    const headers = ['Type', 'Severity', 'Status', 'Location', 'Date']
    const csvData = reports.map(report => [
      report.type,
      report.severity_score,
      report.status,
      report.location || 'N/A',
      formatDate(report.timestamp)
    ])
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `civicfix-reports-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Admin Dashboard</h2>
          <p className="text-gray-600">Monitor and manage infrastructure reports</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="text-3xl font-bold text-blue-700 mb-2">{stats.total_reports}</div>
          <p className="text-gray-600 text-sm">Total Reports</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-white rounded-xl shadow-lg p-6 border border-red-100">
          <div className="text-3xl font-bold text-red-700 mb-2">{stats.today_reports}</div>
          <p className="text-gray-600 text-sm">Today's Reports</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-white rounded-xl shadow-lg p-6 border border-yellow-100">
          <div className="text-3xl font-bold text-yellow-700 mb-2">{stats.reports_by_severity.high || 0}</div>
          <p className="text-gray-600 text-sm">High Priority</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-lg p-6 border border-purple-100">
          <div className="text-3xl font-bold text-purple-700 mb-2">{stats.avg_severity_score.toFixed(1)}</div>
          <p className="text-gray-600 text-sm">Avg. Severity</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Filters</h3>
            <div className="flex flex-wrap gap-2">
              {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map(status => (
                <button
                  key={status}
                  onClick={() => handleFilterChange(status)}
                  className={`px-4 py-2 rounded-lg ${selectedStatus === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status || 'All Status'}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FiDownload />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Reports Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">
              Reports ({reports.length})
            </h3>
            <div className="text-sm text-gray-500">
              {loading ? 'Loading...' : `Last updated: ${new Date().toLocaleTimeString()}`}
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading reports from database...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <FiAlertTriangle className="inline-block text-4xl text-yellow-500 mb-4" />
            <p className="text-gray-600">No reports found. Try adjusting filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-500">Issue Type</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-500">Severity</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-500">Reported</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-500">Risk Assessment</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">
                          {report.type === 'Pothole' && '🕳️'}
                          {report.type === 'Garbage' && '🗑️'}
                          {report.type === 'Streetlight' && '💡'}
                          {report.type === 'Waterlogging' && '🌊'}
                          {!['Pothole', 'Garbage', 'Streetlight', 'Waterlogging'].includes(report.type) && '⚠️'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{report.type}</p>
                          <p className="text-xs text-gray-500">{report.id?.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(report.severity_score)}`}>
                        {report.severity_score}/10
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={report.status || 'OPEN'}
                        onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(report.status)} border-0 focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {formatDate(report.timestamp)}
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-700 max-w-xs truncate">
                        {report.danger_reason || 'No details'}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => alert(`Report ID: ${report.id}\nFull details would show here`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Severity Distribution */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-200">
          <h4 className="font-bold text-blue-800 mb-4">Severity Distribution</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-600">High (7-10)</span>
                <span>{stats.reports_by_severity.high || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${((stats.reports_by_severity.high || 0) / stats.total_reports) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-yellow-600">Medium (4-6)</span>
                <span>{stats.reports_by_severity.medium || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${((stats.reports_by_severity.medium || 0) / stats.total_reports) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-600">Low (1-3)</span>
                <span>{stats.reports_by_severity.low || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${((stats.reports_by_severity.low || 0) / stats.total_reports) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-200">
          <h4 className="font-bold text-purple-800 mb-4">Issue Types</h4>
          <div className="space-y-2">
            {Object.entries(stats.reports_by_type || {}).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{type}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-200">
          <h4 className="font-bold text-green-800 mb-4">Quick Actions</h4>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Send Priority Alert
            </button>
            <button className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
              Generate Monthly Report
            </button>
            <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              AI Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard