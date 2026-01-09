import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FiHome, FiCamera, FiSettings, FiLogOut, FiMenu, FiX, FiUser, FiBarChart2 } from 'react-icons/fi';



const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenu = [
    { path: '/', label: 'Home', icon: <FiHome /> },
    { path: '/report', label: 'Report Issue', icon: <FiCamera /> },
    { path: '/profile', label: 'Profile', icon: <FiUser /> },
  ];

  const adminMenu = [
    ...userMenu,
    { path: '/admin', label: 'Admin Dashboard', icon: <FiBarChart2 /> },
    { path: '/admin/settings', label: 'Settings', icon: <FiSettings /> },
  ];

  const menuItems = isAdmin ? adminMenu : userMenu;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <span className="text-xl text-white">🏙️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">CivicFix</h1>
                <p className="text-xs text-gray-600">
                  {isAdmin ? 'Admin Portal' : 'Citizen Portal'}
                </p>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-6">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {/* User Info */}
              <div className="flex items-center space-x-4 pl-6 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">
                    {user.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isAdmin ? 'City Official' : 'Citizen'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="p-3">
                    <p className="font-medium text-gray-800">{user.email}</p>
                    <p className="text-sm text-gray-500">
                      {isAdmin ? 'City Official' : 'Citizen'}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">CivicFix</h3>
              <p className="text-gray-400">
                Intelligent Urban Infrastructure Reporting
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/" className="hover:text-white">Home</Link></li>
                <li><Link to="/report" className="hover:text-white">Report Issue</Link></li>
                {isAdmin && (
                  <li><Link to="/admin" className="hover:text-white">Admin Dashboard</Link></li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">User</h4>
              <p className="text-gray-400">
                Logged in as: <span className="text-white">{user.email}</span>
              </p>
              <p className="text-gray-400 mt-2">
                Role: <span className={`font-medium ${isAdmin ? 'text-purple-400' : 'text-blue-400'}`}>
                  {isAdmin ? 'City Official' : 'Citizen'}
                </span>
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
            <p>© 2024 CivicFix Hackathon Project • Powered by Google Gemini AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

const handleLogout = () => {
  localStorage.removeItem('user');
  // Force full page reload to clear React state
  window.location.href = '/login';
};