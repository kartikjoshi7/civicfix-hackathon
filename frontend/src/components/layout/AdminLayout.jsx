import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiUsers, FiSettings, FiLogOut, FiHome } from 'react-icons/fi';

const AdminLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Admin Header */}
      <nav className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <span className="text-xl">👑</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">City Official Dashboard</h1>
                <p className="text-xs text-white/80">Infrastructure Management System</p>
              </div>
            </div>

            {/* Admin Menu */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg">
                <FiBarChart2 />
                <span>Dashboard</span>
              </div>
              
              <div className="flex items-center space-x-4 pl-6 border-l border-white/20">
                <div className="text-right">
                  <p className="text-sm font-medium">{user.email || 'Admin'}</p>
                  <p className="text-xs text-white/80">City Official</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/20">
              <div className="space-y-2">
                <div className="p-3">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-white/80">City Official</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-white/20 hover:bg-white/30 rounded-lg"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Admin Footer */}
      <footer className="bg-gray-900 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold mb-2">Admin Controls</h3>
              <p className="text-sm text-gray-400">
                City Infrastructure Management System
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Quick Stats</h3>
              <p className="text-sm text-gray-400">
                Real-time monitoring of city infrastructure
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Logged in as</h3>
              <p className="text-sm text-purple-300">{user.email}</p>
              <p className="text-xs text-gray-400">City Official Account</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-4 text-center text-gray-400 text-sm">
            <p>© 2024 CivicFix City Administration • Restricted Access</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;