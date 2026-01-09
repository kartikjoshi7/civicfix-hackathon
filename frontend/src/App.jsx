import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import HomePage from './pages/Home'
import UserApp from './pages/UserApp'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* Header with Navigation */}
        <header className="bg-white shadow-lg">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link to="/" className="flex items-center space-x-3">
                  <div className="text-3xl">🏙️</div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">CivicFix</h1>
                    <p className="text-sm text-gray-600">From Street to System</p>
                  </div>
                </Link>
              </div>
              
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">
                  Home
                </Link>
                <Link to="/report" className="text-gray-700 hover:text-blue-600 font-medium">
                  Report Issue
                </Link>
                <Link to="/admin" className="text-gray-700 hover:text-purple-600 font-medium">
                  Admin Dashboard
                </Link>
              </nav>
              
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ✅ Running
              </div>
            </div>
            
            {/* Mobile Navigation */}
            <div className="md:hidden mt-4 flex space-x-4">
              <Link to="/report" className="flex-1 text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                📸 Report
              </Link>
              <Link to="/admin" className="flex-1 text-center py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                📊 Admin
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content with Routes */}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/report" element={<UserApp />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-6 mt-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-400">
              CivicFix Hackathon Project • Powered by Google Gemini AI & Google Cloud
            </p>
            <div className="flex justify-center space-x-6 mt-4">
              <a href="#" className="text-gray-400 hover:text-white">GitHub</a>
              <a href="#" className="text-gray-400 hover:text-white">Documentation</a>
              <a href="#" className="text-gray-400 hover:text-white">Team</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App