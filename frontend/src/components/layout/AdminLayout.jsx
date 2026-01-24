import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FiLogOut, FiShield } from 'react-icons/fi';
import Footer from '../shared/Footer'; // Adjusted path

const AdminLayout = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <nav className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500 p-2 rounded-lg"><FiShield size={20} className="text-white" /></div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">City Admin</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Control Center</p>
              </div>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-700">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default AdminLayout;