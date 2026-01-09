import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import UserApp from './pages/UserApp';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  
  useEffect(() => {
    setAuthChecked(true);
    
    // Debug: Log current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('🔍 App mounted - Current user:', user);
  }, []);

  // Auth check functions
  const isLoggedIn = () => {
    const user = localStorage.getItem('user');
    const isLogged = user !== null;
    console.log('🔄 isLoggedIn check:', isLogged);
    return isLogged;
  };
  
  const getUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const role = user.role || 'user';
      console.log('🎭 User role detected:', role);
      return role;
    } catch {
      console.log('⚠️ Error getting role, defaulting to user');
      return 'user';
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('🏁 App rendering - Auth status:', isLoggedIn(), 'Role:', getUserRole());

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        
        {/* USER ROUTE - Only for regular users */}
        <Route path="/user" element={
          (() => {
            console.log('👤 Accessing /user route...');
            if (!isLoggedIn()) {
              console.log('❌ Not logged in, redirecting to login');
              return <Navigate to="/login" replace />;
            }
            
            const role = getUserRole();
            console.log('✅ User role for /user:', role);
            
            if (role === 'admin') {
              console.log('🔄 Admin accessing /user, redirecting to /admin');
              return <Navigate to="/admin" replace />;
            }
            
            // USER ACCESS GRANTED
            console.log('🎉 Rendering UserApp for citizen');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            return (
              <div className="min-h-screen bg-blue-50">
                {/* User Header */}
                <nav className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 shadow-lg">
                  <div className="container mx-auto">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-xl font-bold">👤 Citizen Portal</h1>
                        <p className="text-sm opacity-80">Report infrastructure issues</p>
                        <p className="text-xs opacity-60 mt-1">
                          Logged in as: {user.email || user.name || 'Citizen'}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          localStorage.removeItem('user');
                          window.location.href = '/login';
                        }}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </nav>
                {/* User App Content */}
                <UserApp />
                {/* User Footer */}
                <footer className="bg-gray-800 text-white p-4 mt-8">
                  <div className="container mx-auto text-center text-sm">
                    <p>Citizen Reporting System • For emergency: 1800-XXX-XXXX</p>
                  </div>
                </footer>
              </div>
            );
          })()
        } />
        
        {/* ADMIN ROUTE - Only for admins */}
        <Route path="/admin" element={
          (() => {
            console.log('👑 Accessing /admin route...');
            if (!isLoggedIn()) {
              console.log('❌ Not logged in, redirecting to login');
              return <Navigate to="/login" replace />;
            }
            
            const role = getUserRole();
            console.log('✅ User role for /admin:', role);
            
            if (role !== 'admin') {
              console.log('🔄 User trying to access /admin, redirecting to /user');
              return <Navigate to="/user" replace />;
            }
            
            // ADMIN ACCESS GRANTED
            console.log('🎉 Rendering AdminDashboard');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            return (
              <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
                {/* Admin Header */}
                <nav className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-4 shadow-xl">
                  <div className="container mx-auto">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-xl font-bold">👑 City Administration Dashboard</h1>
                        <p className="text-sm opacity-80">Infrastructure Management System</p>
                        <p className="text-xs opacity-60 mt-1">
                          Logged in as: {user.email || user.name || 'Administrator'}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          localStorage.removeItem('user');
                          window.location.href = '/login';
                        }}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </nav>
                {/* Admin Dashboard Content */}
                <AdminDashboard />
                {/* Admin Footer */}
                <footer className="bg-gray-900 text-white p-6 mt-8">
                  <div className="container mx-auto">
                    <div className="text-center text-sm">
                      <p>© 2024 CivicFix City Administration • Restricted Access</p>
                      <p className="text-gray-400 mt-2">Real-time infrastructure monitoring system</p>
                    </div>
                  </div>
                </footer>
              </div>
            );
          })()
        } />
        
        {/* Redirect root to appropriate page */}
        <Route path="/" element={
          (() => {
            console.log('🏠 Accessing root route...');
            if (!isLoggedIn()) {
              console.log('➡️ Not logged in, redirecting to login');
              return <Navigate to="/login" replace />;
            }
            
            const role = getUserRole();
            console.log(`➡️ Logged in as ${role}, redirecting to ${role === 'admin' ? '/admin' : '/user'}`);
            
            return <Navigate to={role === 'admin' ? '/admin' : '/user'} replace />;
          })()
        } />
        
        {/* Catch all */}
        <Route path="*" element={
          <Navigate to="/" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;