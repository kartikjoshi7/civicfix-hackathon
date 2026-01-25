import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth'; // ⭐ Real Auth Import
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase/config'; // ⭐ Import auth
import { 
  FiMail, FiLock, FiAlertCircle, FiCheck
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
      // 1. 🛡️ SECURITY CHECK: This forces Firebase to verify the password on the server
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Fetch extra user details (like role/city) from Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      // Default data from Auth
      let userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: 'user' // Default role
      };

      // Merge with Firestore data if it exists
      if (userSnap.exists()) {
        userData = { ...userData, ...userSnap.data(), id: firebaseUser.uid };
      }

      // 3. 🧹 CLEANUP: This is CRITICAL for the Rate Limit bug.
      // It wipes the old "userId" from the browser so the new user starts fresh.
      localStorage.clear(); 
      
      // 4. Save FRESH user session
      localStorage.setItem('user', JSON.stringify(userData));

      setSuccess('Login successful! Redirecting...');
      
      // 5. Redirect based on role
      setTimeout(() => {
        if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific Firebase errors for better UX
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to log in. Please check your connection.');
      }
      setLoading(false);
    }
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
        
        <div className="border-t border-gray-200 pt-6">
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
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secured with Firebase Auth
              <br />
              <span className="text-green-600">● Connected to Live System</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;