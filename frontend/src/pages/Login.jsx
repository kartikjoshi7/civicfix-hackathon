import React, { useState, useRef } from 'react'; // ⭐ Added useRef
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebase/config';
import ReCAPTCHA from "react-google-recaptcha"; // ⭐ Import CAPTCHA
import { 
  FiMail, FiLock, FiAlertCircle, FiCheck, FiArrowLeft
} from 'react-icons/fi';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  
  // ⭐ CAPTCHA STATE
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const recaptchaRef = useRef(null);

  // ⭐ REPLACE THIS WITH YOUR REAL SITE KEY FROM GOOGLE!
  // This is a public test key that ONLY works on localhost.
  const TEST_SITE_KEY = "6Ld6tVUsAAAAAOKX6TpW-lEUFxTDvbVLgN83my1o"; 

  const handleCaptchaChange = (value) => {
    console.log("Captcha value:", value);
    // If value is not null, the user passed the test
    setCaptchaVerified(!!value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ⭐ SECURITY CHECK
    if (!captchaVerified && !isResetMode) {
        setError("Please verify that you are not a robot.");
        return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      let userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: 'user' 
      };

      if (userSnap.exists()) {
        userData = { ...userData, ...userSnap.data(), id: firebaseUser.uid };
      }

      localStorage.clear(); 
      localStorage.setItem('user', JSON.stringify(userData));

      setSuccess('Login successful! Redirecting...');
      
      setTimeout(() => {
        if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      // Reset CAPTCHA on error so they have to verify again (Security Best Practice)
      if (recaptchaRef.current) recaptchaRef.current.reset();
      setCaptchaVerified(false);

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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
        setError("Please enter your email address.");
        return;
    }

    // (Optional) You can enforce CAPTCHA for resets too, but for UX we often skip it here
    setError('');
    setSuccess('');
    setLoading(true);

    try {
        await sendPasswordResetEmail(auth, email);
        setSuccess("Reset link sent! Please check your inbox (and spam folder).");
        setIsResetMode(false); 
    } catch (err) {
        console.error("Reset Error:", err);
        if (err.code === 'auth/user-not-found') {
            setError("No account found with this email.");
        } else {
            setError("Failed to send reset link. Try again.");
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl mb-4">
            <img src="/logo.png" alt="CivicFix" className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isResetMode ? 'Reset Password' : 'CivicFix Login'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isResetMode ? 'Enter your email to receive a recovery link' : 'Access the infrastructure management system'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-pulse">
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
          <form onSubmit={isResetMode ? handleResetPassword : handleSubmit} className="space-y-4">
            
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

            {!isResetMode && (
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
            )}

            {/* ⭐ CAPTCHA WIDGET (Only show in Login Mode) */}
            {!isResetMode && (
                <div className="flex justify-center py-2">
                    <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={TEST_SITE_KEY} // ⚠️ REPLACE FOR PRODUCTION
                        onChange={handleCaptchaChange}
                    />
                </div>
            )}

            {!isResetMode && (
                <div className="flex items-center justify-between">
                <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button 
                    type="button"
                    onClick={() => { setIsResetMode(true); setError(''); setSuccess(''); }}
                    className="text-sm text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
                >
                    Forgot password?
                </button>
                </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isResetMode && !captchaVerified)} // ⭐ Disable if captcha not checked
              className={`w-full py-3 text-white rounded-lg font-medium transition-all shadow-lg flex items-center justify-center
                ${(loading || (!isResetMode && !captchaVerified)) 
                    ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                    : isResetMode ? 'bg-gray-800 hover:bg-black' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Processing...
                </span>
              ) : (
                isResetMode ? 'Send Reset Link' : 'Login to CivicFix'
              )}
            </button>

            {isResetMode && (
                <button 
                    type="button"
                    onClick={() => { setIsResetMode(false); setError(''); setSuccess(''); }}
                    className="w-full py-3 text-gray-500 font-bold hover:text-gray-800 flex items-center justify-center gap-2"
                >
                    <FiArrowLeft /> Back to Login
                </button>
            )}

          </form>
        </div>

        {!isResetMode && (
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
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secured with Firebase Auth & reCAPTCHA
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