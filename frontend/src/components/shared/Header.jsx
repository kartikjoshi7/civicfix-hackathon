import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiSettings, FiUser, FiLogOut } from 'react-icons/fi';

const Header = ({ userType = 'user', onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userMenu = [
    { name: 'Home', path: '/', icon: <FiHome /> },
    { name: 'Report Issue', path: '/report', icon: <FiUser /> },
  ];

  const adminMenu = [
    { name: 'Dashboard', path: '/admin', icon: <FiHome /> },
    { name: 'All Reports', path: '/admin/reports', icon: <FiSettings /> },
  ];

  const menuItems = userType === 'admin' ? adminMenu : userMenu;

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <span className="text-xl font-bold">🏙️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">CivicFix</h1>
              <p className="text-xs text-white/80">Intelligent Urban Reporting</p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center gap-2 hover:text-white/80 transition-colors"
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
            
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {userType === 'admin' ? 'Admin Mode' : 'Citizen Mode'}
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FiLogOut />
                Switch
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg"
          >
            {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20">
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/20">
                <div className="px-3 py-2 bg-white/20 rounded-lg text-center mb-3">
                  {userType === 'admin' ? 'Admin Mode' : 'Citizen Mode'}
                </div>
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
                >
                  <FiLogOut />
                  Switch User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;