import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FiCamera, FiLogOut, FiUser, FiHome } from 'react-icons/fi';

const UserLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Simple User Header */}
      <nav className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <span className="text-xl">👤</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Citizen Portal</h1>
                <p className="text-xs text-white/80">Report Infrastructure Issues</p>
              </div>
            </div>

            {/* User Info */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user.email || 'Citizen'}</p>
                <p className="text-xs text-white/80">Role: Citizen</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
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
                  <p className="text-sm text-white/80">Citizen Account</p>
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

      {/* Simple Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            CivicFix Citizen Portal • Report infrastructure issues in your city
          </p>
          <p className="text-xs text-gray-400 mt-2">
            For emergency issues, contact city helpline: 1800-XXX-XXXX
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;