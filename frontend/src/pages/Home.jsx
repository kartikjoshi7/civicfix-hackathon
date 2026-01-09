import React from 'react'
import { Link } from 'react-router-dom'

const HomePage = () => {
  return (
    <div className="text-center">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Welcome to <span className="text-blue-600">CivicFix</span>
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Intelligent Urban Infrastructure Reporting powered by Google Gemini AI
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="p-6 border-2 border-blue-200 rounded-xl bg-blue-50">
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">For Citizens</h3>
              <p className="text-gray-600 mb-6">
                Report potholes, garbage, streetlight issues with AI-powered analysis
              </p>
              <Link 
                to="/report" 
                className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:opacity-90 font-medium"
              >
                Report an Issue →
              </Link>
            </div>
            
            <div className="p-6 border-2 border-purple-200 rounded-xl bg-purple-50">
              <div className="text-5xl mb-4">👑</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">For City Officials</h3>
              <p className="text-gray-600 mb-6">
                Monitor reports, assign severity scores, and prioritize repairs
              </p>
              <Link 
                to="/admin" 
                className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 font-medium"
              >
                View Dashboard →
              </Link>
            </div>
          </div>
        </div>
        
        {/* Features */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-8">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl mb-4">📸</div>
              <h4 className="font-bold text-gray-800 mb-2">1. Capture</h4>
              <p className="text-gray-600">Take a photo of infrastructure issue</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-4">🤖</div>
              <h4 className="font-bold text-gray-800 mb-2">2. Analyze</h4>
              <p className="text-gray-600">AI detects issue & assigns severity score</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-4">🚨</div>
              <h4 className="font-bold text-gray-800 mb-2">3. Action</h4>
              <p className="text-gray-600">City officials prioritize repairs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage