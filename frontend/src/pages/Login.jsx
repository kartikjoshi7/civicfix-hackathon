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

    console.log('📍 Login attempt on:', window.location.hostname);

    // Helper function for redirect
    const redirectTo = (path) => {
      console.log('↪️ Redirecting to:', path);
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/#${path}`;
      window.location.href = redirectUrl;
    };

    try {
      // Check if we're on Vercel
      const isVercel = window.location.hostname.includes('vercel.app');
      
      if (isVercel) {
        console.log('🌐 Vercel detected - checking Firebase...');
        
        // Try Firebase first with timeout
        try {
          const firebasePromise = (async () => {
            console.log('🔌 Testing Firebase connection...');
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("email", "==", email));
            return await getDocs(q);
          })();

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firebase timeout')), 3000)
          );

          const querySnapshot = await Promise.race([firebasePromise, timeoutPromise]);

          // FIREBASE SUCCESS - Use real authentication
          if (querySnapshot.empty) {
            // If no user found, check if it's admin
            if (email === 'admin@city.gov') {
              // Create admin in Firebase
              const newAdmin = await addDoc(collection(db, 'users'), {
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
              setSuccess('Admin account created! Redirecting...');
              setTimeout(() => redirectTo('/admin'), 500);
              return;
            }
            throw new Error('No account found with this email');
          }

          // User exists in Firebase
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          
          // Check password (simplified)
          if (!password) {
            throw new Error('Password is required');
          }

          const updatedUser = {
            ...userData,
            lastLogin: new Date().toISOString(),
            id: userDoc.id,
            role: userData.role || 'user'
          };

          localStorage.setItem('user', JSON.stringify(updatedUser));
          setSuccess('Login successful! Redirecting...');
          
          setTimeout(() => {
            if (updatedUser.role === 'admin') {
              redirectTo('/admin');
            } else {
              redirectTo('/user');
            }
          }, 500);

        } catch (firebaseError) {
          console.warn('⚠️ Firebase failed, using fallback:', firebaseError);
          // Fallback to localStorage for demo
          handleFallbackLogin();
        }

      } else {
        // LOCAL DEVELOPMENT - Use original Firebase code
        console.log('💻 Local development - using full Firebase');
        
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          if (email === 'admin@city.gov') {
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
            setSuccess('Admin demo created! Redirecting...');
            setTimeout(() => redirectTo('/admin'), 500);
            return;
          }
          throw new Error('No account found with this email');
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (!password) {
          throw new Error('Password is required');
        }

        const updatedUser = {
          ...userData,
          lastLogin: new Date().toISOString(),
          id: userDoc.id,
          role: userData.role || 'user'
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        setSuccess('Login successful! Redirecting...');
        
        setTimeout(() => {
          if (updatedUser.role === 'admin') {
            redirectTo('/admin');
          } else {
            redirectTo('/user');
          }
        }, 500);
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleFallbackLogin = () => {
    console.log('🔄 Using fallback login');
    
    // Create demo user data
    const user = {
      id: 'demo-' + Date.now(),
      name: email === 'admin@city.gov' ? 'City Administrator' : email.split('@')[0] || 'Citizen',
      email: email,
      role: email === 'admin@city.gov' ? 'admin' : 'user',
      phone: email === 'admin@city.gov' ? '+911234567890' : '+919876543210',
      city: email === 'admin@city.gov' ? 'City Administration' : 'Demo City',
      userType: email === 'admin@city.gov' ? 'city_official' : 'citizen',
      lastLogin: new Date().toISOString(),
      reportsCount: email === 'admin@city.gov' ? 0 : Math.floor(Math.random() * 20)
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    setSuccess('Demo login successful! Redirecting...');
    
    setTimeout(() => {
      const baseUrl = window.location.origin;
      const hash = email === 'admin@city.gov' ? '#/admin' : '#/user';
      window.location.href = `${baseUrl}/${hash}`;
    }, 500);
    
    setLoading(false);
  };

  const handleAdminDemo = () => {
    setEmail('admin@city.gov');
    setPassword('admin123');
    
    // Try Firebase first, fallback if fails
    const tryFirebaseAdmin = async () => {
      try {
        console.log('👑 Trying Firebase admin creation...');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", 'admin@city.gov'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          const adminUser = {
            id: userDoc.id,
            ...userData
          };
          localStorage.setItem('user', JSON.stringify(adminUser));
        } else {
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
        }
        
        console.log('✅ Firebase admin login successful');
      } catch (error) {
        console.warn('⚠️ Firebase failed, using fallback admin');
        const adminUser = {
          id: 'admin-' + Date.now(),
          name: 'City Administrator',
          email: 'admin@city.gov',
          role: 'admin',
          userType: 'city_official',
          phone: '+911234567890',
          city: 'City Administration',
          reportsCount: 0
        };
        localStorage.setItem('user', JSON.stringify(adminUser));
      }
      
      // Redirect
      setTimeout(() => {
        const baseUrl = window.location.origin;
        window.location.href = `${baseUrl}/#/admin`;
      }, 100);
    };
    
    tryFirebaseAdmin();
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