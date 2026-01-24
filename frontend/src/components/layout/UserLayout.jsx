import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import Footer from '../shared/Footer'; // Adjusted path for your structure

const UserLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white"><span className="text-xl">🏙️</span></div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">CivicFix</h1>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Citizen Portal</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <span className="text-sm font-semibold">{user.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-sm font-bold transition-all">
                <FiLogOut /> Logout
              </button>
            </div>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-gray-600">
              {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-5xl mx-auto p-4">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default UserLayout;