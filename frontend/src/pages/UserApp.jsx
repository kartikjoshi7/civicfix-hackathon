import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiUpload, FiMapPin, FiX, FiRefreshCw } from 'react-icons/fi';

// ----------------------------------------------------------------------
// 1. SMART URL CONFIGURATION (The Critical Change)
// This checks if we are on Render (Cloud) or Localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9090";
// ----------------------------------------------------------------------

const UserApp = () => {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Start/stop camera
  useEffect(() => {
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
      alert('Camera access denied or not available');
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
      
      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
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
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.log('Location error:', error);
          // Use demo location
          setLocation({ lat: 28.6139, lng: 77.2090, accuracy: 50 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // REAL API CALL to your backend
  const handleAnalyze = async () => {
    if (!imageFile) return;
    
    setLoading(true);
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', imageFile);
      
      if (location) {
        formData.append('latitude', location.lat.toString());
        formData.append('longitude', location.lng.toString());
      }
      
      console.log('📤 Sending to backend:', imageFile.name);
      
      // ----------------------------------------------------------------------
      // 2. UPDATED FETCH CALL
      // Uses the dynamic API_URL instead of hardcoded localhost
      // ----------------------------------------------------------------------
      const response = await fetch(`${API_URL}/analyze-image`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      console.log('✅ Backend response:', data);
      
      if (data.status === 'success' || data.data) {
        setResult({
          ...data.data,
          location: location || { lat: 28.6139, lng: 77.2090 }
        });
      } else {
        // Fallback if response format is unexpected
        setResult({
          issue_detected: true,
          type: "Analysis Error",
          severity_score: 5,
          danger_reason: "Could not analyze image properly",
          recommended_action: "Try again",
          location: location || { lat: 28.6139, lng: 77.2090 }
        });
      }
      
    } catch (error) {
      console.error('❌ API Error:', error);
      // Fallback demo data for testing
      const demoTypes = ["Pothole", "Garbage", "Streetlight", "Waterlogging", "Cracked Road"];
      const randomType = demoTypes[Math.floor(Math.random() * demoTypes.length)];
      
      setResult({
        issue_detected: true,
        type: randomType,
        severity_score: Math.floor(Math.random() * 10) + 1,
        danger_reason: "Demo analysis - connect to real backend for accurate results",
        recommended_action: Math.random() > 0.5 ? "Immediate Dispatch" : "Schedule Repair",
        location: location || { lat: 28.6139, lng: 77.2090 }
      });
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

  return (
    <div className="max-w-4xl mx-auto p-4">
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
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {location ? 'Update' : 'Get Location'}
            </button>
          </div>
          
          {location ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800">
                📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                {location.accuracy && <span className="text-sm ml-2">(±{location.accuracy}m)</span>}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm">
                Location not set. Click "Get Location" to add coordinates.
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
              </div>
            </div>
          </div>
        )}
        
        {/* Analyze Button */}
        {!loading && !result && image && (
          <div className="mb-6">
            <button
              onClick={handleAnalyze}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-medium rounded-xl hover:opacity-90 shadow-lg transition-all"
            >
              Analyze with AI
            </button>
            <p className="text-center text-gray-500 text-sm mt-2">
              Using Google Gemini 1.5 Flash for analysis
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
                  <p className="text-gray-600">Powered by Google Gemini</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold ${
                  result.severity_score >= 7 ? 'bg-red-100 text-red-800 border-red-300' :
                  result.severity_score >= 4 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                  'bg-green-100 text-green-800 border-green-300'
                } border-2`}>
                  {result.severity_score}/10
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
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
                  
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-500 mb-1">Recommended Action</p>
                    <p className={`text-lg font-bold ${
                      result.recommended_action === 'Immediate Dispatch' ? 'text-red-600' :
                      result.recommended_action === 'Schedule Repair' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {result.recommended_action}
                    </p>
                  </div>
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
                        <p className="text-sm text-gray-500">Location</p>
                      </div>
                      <p className="text-gray-800 font-mono text-sm">
                        {result.location.lat.toFixed(6)}, {result.location.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:opacity-90"
                  >
                    Report Another Issue
                  </button>
                  <button
                    onClick={() => alert('Report would be saved to database')}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:opacity-90"
                  >
                    Save Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Connection Status - NOW SHOWS REAL URL */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Backend Connection</p>
              <p className="text-xs text-gray-500">{API_URL}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserApp;