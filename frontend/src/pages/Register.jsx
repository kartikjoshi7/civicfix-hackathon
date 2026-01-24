import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/config'; // Import auth and db
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Import Auth function
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { 
  FiUser, FiMail, FiPhone, FiMapPin, 
  FiLock, FiAlertCircle, FiCheck 
} from 'react-icons/fi';

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Invalid email format');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (formData.phone.length < 10) {
      setError('Phone number must be at least 10 digits');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Starting Registration for:', formData.email);

      // 1. CREATE USER IN FIREBASE AUTHENTICATION
      // This is the step that makes them appear in the "Authentication" tab
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      console.log('✅ Auth Account Created! UID:', user.uid);

      // 2. PREPARE DATABASE DATA
      // We do NOT store the password in the database for security
      const userData = {
        uid: user.uid, // Important: Store the Auth UID
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode,
        userType: 'citizen',
        role: 'user', 
        createdAt: new Date().toISOString(),
        status: 'active',
        reportsCount: 0,
        lastLogin: new Date().toISOString()
      };

      // 3. SAVE TO FIRESTORE DATABASE
      // We use setDoc with user.uid so the Auth ID and Database ID are the same
      await setDoc(doc(db, "users", user.uid), userData);
      
      console.log('✅ User Profile Saved to Firestore');
      
      // 4. SAVE TO LOCAL STORAGE (For the session)
      localStorage.setItem('user', JSON.stringify(userData));

      setSuccess('Registration successful! Redirecting to dashboard...');

      // Redirect to user dashboard
      setTimeout(() => {
        window.location.href = '/user';
      }, 1500);

    } catch (err) {
      console.error('❌ Registration error:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-8 text-center">
          <h1 className="text-3xl font-bold">Join CivicFix as a Citizen</h1>
          <p className="mt-2">Report infrastructure issues and improve your city</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <FiAlertCircle className="text-red-500 text-xl mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <FiCheck className="text-green-500 text-xl mt-0.5" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Role Information */}
          <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FiUser className="text-2xl text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Citizen Account</h3>
                <p className="text-gray-600">
                  You're registering as a citizen. This allows you to report infrastructure issues 
                  and track their resolution status.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiUser className="inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMail className="inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiPhone className="inline mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="inline mr-2" />
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Mumbai"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="inline mr-2" />
                  Complete Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Street, Area, Landmark"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="inline mr-2" />
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="400001"
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiLock className="inline mr-2" />
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiLock className="inline mr-2" />
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            {/* Terms and Submit */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center mb-6">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="mr-3"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Creating Account...
                    </span>
                  ) : (
                    'Create Citizen Account'
                  )}
                </button>

                <Link
                  to="/login"
                  className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-center transition-all"
                >
                  Already have an account? Login
                </Link>
              </div>
            </div>
          </form>

          {/* Benefits Section */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Benefits of Citizen Account:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="text-2xl mb-2">📸</div>
                <p className="font-medium text-gray-800">Report Issues</p>
                <p className="text-sm text-gray-600">Upload photos of infrastructure problems</p>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl mb-2">📊</div>
                <p className="font-medium text-gray-800">Track Progress</p>
                <p className="text-sm text-gray-600">Monitor status of your reports</p>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl mb-2">🏆</div>
                <p className="font-medium text-gray-800">Community Impact</p>
                <p className="text-sm text-gray-600">Contribute to city improvement</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;