import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiUpload, FiMapPin, FiX, FiRefreshCw, FiUser, FiMail, FiPhone } from 'react-icons/fi';
import { reportService, userService } from '../services/firebaseService';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '../firebase/config'; 

const UserApp = () => {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Helper to safely get User ID
  const getSafeUserId = (userObj) => {
    if (!userObj) return null;
    return userObj.uid || userObj.id || userObj.email;
  };

  // Function to force-fetch latest data from Firestore
  const fetchFreshUserData = async () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = getSafeUserId(storedUser);

    if (userId) {
      try {
        console.log("🔄 Syncing profile stats for ID:", userId);
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const freshData = userSnap.data();
          // Merge local data with fresh DB data
          const mergedUser = { ...storedUser, ...freshData, id: userId };
          
          setUserDetails(mergedUser);
          localStorage.setItem('user', JSON.stringify(mergedUser));
          console.log("✅ Profile Synced! Real Reports Count:", freshData.reportsCount);
        }
      } catch (error) {
        console.error("❌ Sync failed:", error);
      }
    }
  };

  // Initial Load
  useEffect(() => {
    // 1. Load from local storage for speed
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUserDetails(storedUser);
    
    // 2. Force Sync from DB to ensure count is correct
    fetchFreshUserData();

    // Camera cleanup
    if (useCamera && videoRef.current) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [useCamera]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access denied. Please check permissions.');
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          setImageFile(file);
          setImage(URL.createObjectURL(blob));
          setUseCamera(false);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImage(URL.createObjectURL(file));
      setResult(null);
      setUseCamera(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Set raw coordinates first
          setLocation({
            lat: lat,
            lng: lng,
            accuracy: position.coords.accuracy,
            address: 'Fetching address...'
          });

          // Fetch Address from OpenStreetMap
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();

            if (data && data.display_name) {
              const fullAddress = data.display_name;
              const addr = data.address || {};
              const newCity = addr.village || addr.town || addr.city || addr.county || addr.state_district || "Unknown Location";

              // Update Location State
              setLocation(prev => ({ ...prev, address: fullAddress }));

              // Update User Profile Locally & in DB
              const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
              const updatedUser = { ...currentUser, city: newCity, address: fullAddress };
              
              setUserDetails(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));

              const userId = getSafeUserId(currentUser);
              if (userId) {
                userService.updateUser(userId, {
                  city: newCity,
                  address: fullAddress,
                  lastLocation: { lat, lng }
                }).catch(err => console.error("Failed to update user DB", err));
              }
            } 
          } catch (error) {
            console.error("Geocoding error:", error);
            setLocation(prev => ({ ...prev, address: "Address lookup failed (Coordinates saved)" }));
          }
        },
        (error) => {
          console.error('Location error:', error);
          alert("Could not fetch location. Please enable GPS.");
          // REMOVED DEMO FALLBACK
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const saveReportToFirebase = async (reportData) => {
    try {
      setSaving(true);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = getSafeUserId(user);

      if (!userId) {
        alert("Error: User ID not found. Please re-login.");
        return;
      }

      const reportPayload = {
        issueType: reportData.type,
        severityScore: reportData.severity_score,
        dangerReason: reportData.danger_reason,
        recommendedAction: reportData.recommended_action,
        issueDetected: reportData.issue_detected,
        
        userId: userId,
        userName: user.name || 'Anonymous',
        userEmail: user.email,
        userPhone: user.phone || 'Not provided',
        userCity: user.city || 'Unknown',
        userAddress: user.address || 'Not provided',
        
        location: {
          coordinates: {
            lat: location?.lat || reportData.location?.lat || 0,
            lng: location?.lng || reportData.location?.lng || 0
          },
          accuracy: location?.accuracy || 0,
          address: location?.address || 'Not available'
        },
        
        imageName: imageFile?.name || 'camera-photo.jpg',
        imageSize: imageFile?.size || 0,
        imageType: imageFile?.type || 'image/jpeg',
        
        status: 'OPEN',
        priority: reportData.severity_score >= 7 ? 'HIGH' : 
                  reportData.severity_score >= 4 ? 'MEDIUM' : 'LOW',
        aiGenerated: true,
        aiConfidence: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        source: 'web_app',
        deviceInfo: navigator.userAgent
      };
      
      console.log('📝 Saving report to Firebase:', reportPayload);
      const savedReport = await reportService.createReport(reportPayload);
      console.log('✅ Report saved with ID:', savedReport.id);
      
      // ⭐ FORCE SYNC: Fetch the updated count from DB immediately
      await fetchFreshUserData();
      
      return savedReport;
      
    } catch (error) {
      console.error('❌ Error saving report to Firebase:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      
      if (location) {
        formData.append('latitude', location.lat.toString());
        formData.append('longitude', location.lng.toString());
      }
      
      console.log('📤 Sending to backend:', imageFile.name);
      
      const response = await fetch('http://localhost:9090/analyze-image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      console.log('✅ Backend response:', data);
      
      let analysisResult;
      
      if (data.status === 'success' || data.data) {
        analysisResult = {
          ...data.data,
          location: location || { lat: 28.6139, lng: 77.2090 }
        };
      } else {
        throw new Error("Invalid response from Backend");
      }
      
      setResult(analysisResult);
      
      // Auto-save to Firebase
      try {
        await saveReportToFirebase(analysisResult);
        console.log('🔥 Report auto-saved to Firebase');
      } catch (firebaseError) {
        console.warn('⚠️ Could not save to Firebase:', firebaseError);
      }
      
    } catch (error) {
      console.error('❌ API Error:', error);
      alert("Analysis failed. Please check if the backend server is running.");
      // REMOVED DEMO FALLBACK
      
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setUseCamera(false);
    stopCamera();
  };

  const handleManualSave = async () => {
    if (!result) return;
    try {
      await saveReportToFirebase(result);
      alert('✅ Report saved successfully to Firebase!');
    } catch (error) {
      alert('❌ Error saving report: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* User Info Card */}
      {userDetails && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiUser className="text-blue-600" />
                {userDetails.name || 'Citizen'}
              </h3>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FiMail /> {userDetails.email}
                </span>
                {userDetails.phone && (
                  <span className="flex items-center gap-1">
                    <FiPhone /> {userDetails.phone}
                  </span>
                )}
                {userDetails.city && (
                  <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800 font-medium">
                    📍 {userDetails.city}
                  </span>
                )}
                {/* Reports Count with Sync Button */}
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                    Reports: {userDetails.reportsCount || 0}
                  </span>
                  <button 
                    onClick={fetchFreshUserData} 
                    className="p-1 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                    title="Force Refresh Data"
                  >
                    <FiRefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Report Infrastructure Issue</h2>
        <p className="text-gray-600 mb-6">Upload or capture photo for AI analysis with Google Gemini</p>
        
        {/* Camera Preview */}
        {useCamera && (
          <div className="mb-6 relative">
            <div className="relative bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-96 object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                >
                  <div className="w-14 h-14 bg-red-500 rounded-full"></div>
                </button>
              </div>
            </div>
            <button
              onClick={() => setUseCamera(false)}
              className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full"
            >
              <FiX />
            </button>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
        
        {/* Upload Options */}
        {!useCamera && !image && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload className="text-5xl text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-800">Upload Photo</p>
                <p className="text-sm text-gray-500 mt-2">From gallery or files</p>
              </div>
              
              <div 
                className="border-2 border-dashed border-green-300 rounded-xl p-8 text-center cursor-pointer hover:bg-green-50 transition-all"
                onClick={() => setUseCamera(true)}
              >
                <FiCamera className="text-5xl text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-800">Take Photo</p>
                <p className="text-sm text-gray-500 mt-2">Use camera</p>
              </div>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}
        
        {/* Image Preview */}
        {image && !useCamera && (
          <div className="mb-6">
            <div className="relative">
              <img 
                src={image} 
                alt="Uploaded" 
                className="w-full max-h-96 object-contain rounded-xl shadow-lg"
              />
              <button 
                onClick={resetForm}
                className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              >
                <FiX />
              </button>
              <button 
                onClick={() => setUseCamera(true)}
                className="absolute top-4 left-4 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
              >
                <FiRefreshCw />
              </button>
            </div>
          </div>
        )}
        
        {/* Location */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <FiMapPin className="text-blue-500" /> Location
            </h3>
            <button
              onClick={handleGetLocation}
              className="text-sm text-blue-600 hover:text-blue-800 px-4 py-2 bg-blue-100 rounded-lg"
            >
              {location ? 'Update Location' : 'Get Location'}
            </button>
          </div>
          
          {location ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800 font-medium">
                📍 Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                {location.accuracy && <span className="text-sm ml-2">(Accuracy: ±{location.accuracy}m)</span>}
              </p>
              {location.address && (
                <p className="text-green-700 text-sm mt-1">{location.address}</p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm">
                Location not set. Click "Get Location" to add coordinates for accurate reporting.
              </p>
            </div>
          )}
        </div>
        
        {/* Loading */}
        {loading && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="mt-4 text-lg font-medium text-gray-800">Analyzing with Google Gemini AI...</p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">1. Uploading image to server ✓</p>
                <p className="text-sm text-gray-600">2. AI analyzing infrastructure issue...</p>
                <p className="text-sm text-gray-600">3. Generating severity score...</p>
                <p className="text-sm text-gray-600">4. Saving to Firebase database...</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Analyze Button */}
        {!loading && !result && image && (
          <div className="mb-6">
            <button
              onClick={handleAnalyze}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-medium rounded-xl hover:opacity-90 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!image}
            >
              Analyze with AI & Save Report
            </button>
            <p className="text-center text-gray-500 text-sm mt-2">
              Using <strong>Google Gemini 2.0 Flash</strong> • Auto-saves to Firebase
            </p>
          </div>
        )}
        
        {/* Results */}
        {result && (
          <div className="mb-6 animate-fadeIn">
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">AI Analysis Results</h3>
                  <p className="text-gray-600">Powered by Google Gemini • Saved to Firebase</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold ${
                  result.severity_score >= 7 ? 'bg-red-100 text-red-800 border-red-300' :
                  result.severity_score >= 4 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                  'bg-green-100 text-green-800 border-green-300'
                } border-2`}>
                  Severity: {result.severity_score}/10
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Issue Type</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {result.type === 'Pothole' && '🕳️'}
                        {result.type === 'Garbage' && '🗑️'}
                        {result.type === 'Streetlight' && '💡'}
                        {result.type === 'Waterlogging' && '🌊'}
                        {result.type === 'Cracked Road' && '🛣️'}
                        {!['Pothole', 'Garbage', 'Streetlight', 'Waterlogging', 'Cracked Road'].includes(result.type) && '⚠️'}
                      </span>
                      <p className="text-xl font-bold text-gray-800">{result.type}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Recommended Action</p>
                    <p className={`text-lg font-bold ${
                      result.recommended_action === 'Immediate Dispatch' ? 'text-red-600' :
                      result.recommended_action === 'Schedule Repair' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {result.recommended_action}
                    </p>
                  </div>
                  
                  {userDetails && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-500 mb-1">Reported By</p>
                      <p className="font-medium text-gray-800">{userDetails.name}</p>
                      <p className="text-sm text-gray-600">{userDetails.email}</p>
                      {userDetails.phone && (
                        <p className="text-sm text-gray-600">{userDetails.phone}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-500 mb-1">Risk Assessment</p>
                    <p className="text-gray-800">{result.danger_reason}</p>
                  </div>
                  
                  {result.location && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <FiMapPin className="text-green-500" />
                        <p className="text-sm text-gray-500">Report Location</p>
                      </div>
                      <p className="text-gray-800 font-mono text-sm">
                        {result.location.lat.toFixed(6)}, {result.location.lng.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {location?.address || 'Location coordinates recorded'}
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-500 mb-1">Firebase Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-green-700 font-medium">Report saved to database</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Collection: "reports" • Project: civicfix-hackfest
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:opacity-90 transition-all"
                    disabled={saving}
                  >
                    Report Another Issue
                  </button>
                  
                  <button
                    onClick={handleManualSave}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={saving}
                  >
                    {saving ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Saving...
                      </span>
                    ) : (
                      'Save Another Copy'
                    )}
                  </button>
                  
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 transition-all"
                  >
                    Print Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Firebase Connection Status */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Firebase Connection</p>
              <p className="text-xs text-gray-500">Project: civicfix-hackfest-b6776</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>📁 Collection: users</div>
            <div>📁 Collection: reports</div>
            <div>👤 Your Reports: {userDetails?.reportsCount || 0}</div>
            <div>📍 Location: {location ? 'Set' : 'Not set'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserApp;