import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import UserApp from './pages/UserApp';
import AdminDashboard from './pages/AdminDashboard';

// Layouts - FIXED PATHS
import UserLayout from './components/layout/UserLayout';
import AdminLayout from './components/layout/AdminLayout';
import Layout from './components/layout/Layout';

function App() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = () => !!localStorage.getItem('user');
  const getRole = () => getUser().role || 'user';

  // Protected Route Wrapper
  const ProtectedRoute = ({ allowedRoles }) => {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    
    const userRole = getRole();
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return <Navigate to={userRole === 'admin' ? '/admin' : '/user'} replace />;
    }

    return <Outlet />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route element={<Layout />}>
          <Route path="/login" element={isLoggedIn() ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={isLoggedIn() ? <Navigate to="/" /> : <Register />} />
        </Route>

        {/* ROOT REDIRECT */}
        <Route path="/" element={
          isLoggedIn() 
            ? <Navigate to={getRole() === 'admin' ? '/admin' : '/user'} replace /> 
            : <Navigate to="/login" replace />
        } />

        {/* USER ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={['user']} />}>
          <Route element={<UserLayout />}>
            <Route path="/user" element={<UserApp />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;