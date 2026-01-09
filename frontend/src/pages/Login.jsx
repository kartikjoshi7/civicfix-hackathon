import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { 
  FiMail, FiLock, FiAlertCircle, FiCheck,
  FiHome, FiShield
} from 'react-icons/fi';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setLoading(true);

  try {
    // Query Firestore for user
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // If no user found, check if it's a demo admin
      if (email === 'admin@city.gov') {
        // Auto-create admin account for demo
        const newAdmin = await addDoc(usersRef, {
          name: 'City Administrator',
          email: 'admin@city.gov',
          phone: '+911234567890',
          city: 'City Administration',
          role: 'admin',
          userType: 'city_official',
          createdAt: new Date().toISOString(),
          status: 'active',
          reportsCount: 0
        });
        
        const adminUser = {
          id: newAdmin.id,
          name: 'City Administrator',
          email: 'admin@city.gov',
          role: 'admin',
          userType: 'city_official'
        };
        
        localStorage.setItem('user', JSON.stringify(adminUser));
        console.log('✅ Admin demo created, redirecting to /admin');
        setSuccess('Admin demo account created! Redirecting...');
        
        // FORCE REDIRECT with window.location
        setTimeout(() => {
          window.location.href = '/admin';
        }, 500);
        return;
      }
      throw new Error('No account found with this email');
    }

    // Get user data
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check password (simplified for demo)
    if (!password) {
      throw new Error('Password is required');
    }

    // Update last login
    const updatedUser = {
      ...userData,
      lastLogin: new Date().toISOString(),
      id: userId
    };

    // Store in localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('✅ Login successful, redirecting to:', updatedUser.role === 'admin' ? '/admin' : '/user');
    setSuccess('Login successful! Redirecting...');

    // FORCE REDIRECT with window.location
    setTimeout(() => {
      if (updatedUser.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/user';
      }
    }, 500);

  } catch (err) {
    console.error('Login error:', err);
    setError(err.message || 'Login failed. Please try again.');
    setLoading(false);
  }
};
  const handleAdminDemo = () => {
  setEmail('admin@city.gov');
  setPassword('admin123');
  
  // Auto-create admin user and redirect
  const adminUser = {
    id: 'demo-admin-' + Date.now(),
    name: 'City Administrator',
    email: 'admin@city.gov',
    role: 'admin',
    userType: 'city_official',
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem('user', JSON.stringify(adminUser));
  console.log('🚀 Admin demo login, redirecting to /admin');
  
  // Force redirect immediately
  setTimeout(() => {
    window.location.href = '/admin';
  }, 100);
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl mb-4">
            <span className="text-3xl text-white">🏙️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">CivicFix Login</h1>
          <p className="text-gray-600 mt-2">Access the infrastructure management system</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <FiAlertCircle className="text-red-500 text-xl mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <FiCheck className="text-green-500 text-xl mt-0.5" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Admin Demo Button - KEEP THIS */}
        <div className="mb-6">
          <p className="text-center text-gray-500 text-sm mb-3">Quick Admin Demo:</p>
          <button
            onClick={handleAdminDemo}
            className="w-full py-4 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-lg font-medium hover:from-purple-200 hover:to-purple-300 transition-all shadow-sm border-2 border-purple-300"
          >
            <div className="flex items-center justify-center gap-3">
              <FiShield className="text-xl" />
              <div>
                <div className="text-lg font-bold">City Administrator</div>
                <div className="text-sm font-normal">Dashboard Access</div>
              </div>
            </div>
            <div className="text-xs text-purple-600 mt-2">
              Click to auto-login as City Official
            </div>
          </button>
          <p className="text-xs text-center text-gray-500 mt-2">
            Email: admin@city.gov | Password: admin123
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <p className="text-center text-gray-500 text-sm mb-4">Or login manually:</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMail className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiLock className="inline mr-2" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Logging in...
                </span>
              ) : (
                'Login to CivicFix'
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?
            <Link
              to="/register"
              className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              Create Citizen Account
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            (Admin accounts are created separately)
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secured with Firebase Firestore
              <br />
              <span className="text-green-600">● Connected to civicfix-hackfest</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;   