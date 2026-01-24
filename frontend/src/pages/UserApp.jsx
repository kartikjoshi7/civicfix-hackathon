import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiUpload, FiMapPin, FiX, FiRefreshCw, FiActivity, FiCheckCircle, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
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
  const [errorMsg, setErrorMsg] = useState(null); // ⭐ NEW: State for error messages
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // --- 1. DATA SYNC ---
  const fetchFreshUserData = async () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = storedUser.uid || storedUser.id;

    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const freshData = { ...storedUser, ...userSnap.data(), id: userId };
          setUserDetails(freshData);
          localStorage.setItem('user', JSON.stringify(freshData));
        }
      } catch (e) { console.error("Sync error:", e); }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setLocation({ lat: 0, lng: 0, address: "Locating..." });

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        const fullAddress = data.display_name || "Address Found";
        const city = data.address?.city || "Unknown City";

        setLocation({ lat: latitude, lng: longitude, address: fullAddress });
        
        const updatedUser = { ...userDetails, city, address: fullAddress };
        setUserDetails(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        if (userDetails?.uid || userDetails?.id) {
          userService.updateUser(userDetails.uid || userDetails.id, { city, address: fullAddress });
        }
      } catch (e) { setLocation({ lat: latitude, lng: longitude, address: "Address lookup failed" }); }
    }, (err) => {
        alert("GPS Access Denied. Please enable location.");
        setLocation(null);
    });
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUserDetails(storedUser);
    fetchFreshUserData(); 
    handleGetLocation(); 
    return () => stopCamera();
  }, []);

  // --- 2. CAMERA ---
  useEffect(() => { if (useCamera) startCamera(); else stopCamera(); }, [useCamera]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) { alert('Camera denied'); setUseCamera(false); }
  };

  const stopCamera = () => { if (stream) stream.getTracks().forEach(t => t.stop()); setStream(null); };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      canvasRef.current.getContext('2d').drawImage(videoRef.current, 0, 0);
      canvasRef.current.toBlob(blob => {
        setImageFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
        setImage(URL.createObjectURL(blob));
        setUseCamera(false);
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImage(URL.createObjectURL(e.target.files[0]));
      setResult(null);
      setErrorMsg(null);
    }
  };

  // --- 3. ANALYSIS (Updated with Rate Limit Handling) ---
  const handleAnalyze = async () => {
    if (!imageFile) return;
    if (!location || location.address === "Locating...") { alert("Wait for location..."); return; }

    setLoading(true);
    setErrorMsg(null);

    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      fd.append('latitude', location.lat);
      fd.append('longitude', location.lng);
      // ⭐ SEND USER ID FOR RATE LIMITING
      fd.append('user_id', userDetails?.id || userDetails?.uid || 'anonymous');
      
      const res = await fetch('https://civicfix-hackfest.onrender.com/analyze-image', { method: 'POST', body: fd });
      
      // ⭐ HANDLE RATE LIMIT ERROR (429)
      if (res.status === 429) {
          const errData = await res.json();
          setErrorMsg(errData.detail || "Daily report limit reached (5/5).");
          setLoading(false);
          return;
      }

      const data = await res.json();
      
      if (data.status === 'success' || data.data) {
        const rawData = data.data || {};
        
        const analysis = {
            issue_detected: rawData.issue_detected ?? true, 
            type: rawData.type || "General Issue",
            severity_score: rawData.severity_score || 5,
            recommended_action: rawData.recommended_action || "Inspection Required",
            danger_reason: rawData.danger_reason || "Potential hazard detected",
            location: location 
        };

        setResult(analysis);
        await saveReport(analysis);

      } else {
          throw new Error("Invalid AI Response");
      }
    } catch (e) { 
        console.error(e);
        setErrorMsg("Server Error. Is Backend Running?");
    } finally { 
        setLoading(false); 
    }
  };

  const saveReport = async (data) => {
    setSaving(true);
    try {
      const userId = userDetails?.uid || userDetails?.id;
      
      const reportPayload = {
        type: data.type || "Unknown",
        severity_score: Number(data.severity_score) || 1,
        danger_reason: data.danger_reason || "None",
        recommended_action: data.recommended_action || "Review",
        status: 'OPEN',
        source: 'web_app',
        userId: userId || 'anonymous',
        userName: userDetails?.name || 'Citizen',
        userEmail: userDetails?.email || 'No Email',
        location: { 
            coordinates: { 
                lat: Number(data.location?.lat) || 0, 
                lng: Number(data.location?.lng) || 0 
            }, 
            address: data.location?.address || "Unknown" 
        },
        timestamp: new Date().toISOString()
      };

      await reportService.createReport(reportPayload);

      const newCount = (userDetails?.reportsCount || 0) + 1;
      const updatedUser = { ...userDetails, reportsCount: newCount };
      setUserDetails(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (userId) userService.updateUser(userId, { reportsCount: newCount });

    } catch (e) { 
        console.error("Firebase Save Error:", e); 
        // Don't show error to user if AI worked but save failed slightly
    } finally { 
        setSaving(false); 
    }
  };

  const reset = () => { setImage(null); setImageFile(null); setResult(null); setUseCamera(false); setErrorMsg(null); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans text-gray-800">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-6 shadow-sm border border-blue-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-10 -mt-10 blur-3xl opacity-50"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Hello, {userDetails?.name?.split(' ')[0] || 'Citizen'} <span className="animate-pulse">👋</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-xs font-bold text-blue-600 border border-blue-100 shadow-sm">
                <FiMapPin /> {userDetails?.city || 'Locating...'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-blue-100">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><FiActivity size={20} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reports Filed</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-800">{userDetails?.reportsCount || 0}</span>
                <button onClick={fetchFreshUserData} className="text-gray-400 hover:text-blue-600 transition-colors"><FiRefreshCw size={12} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-600 p-2 rounded-lg"><FiCamera /></span>
          Report Issue
        </h2>

        {/* ⭐ NEW: Error Message Display */}
        {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 animate-bounce">
                <FiAlertCircle className="text-xl" />
                <span className="font-bold">{errorMsg}</span>
            </div>
        )}

        {useCamera ? (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-6">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 border-4 border-white rounded-full bg-red-500"></button>
            <button onClick={() => setUseCamera(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full"><FiX /></button>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : image && !loading && !result ? (
          <div className="relative rounded-2xl overflow-hidden shadow-md group mb-6 bg-gray-50 border border-gray-200">
            <img src={image} alt="Preview" className="w-full h-64 object-contain" />
            <button onClick={reset} className="absolute top-3 right-3 bg-white text-gray-700 p-2 rounded-full shadow-lg"><FiX /></button>
          </div>
        ) : !loading && !result ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl hover:bg-blue-50 transition-all">
              <FiUpload size={24} className="text-blue-600 mb-2" />
              <span className="font-semibold text-blue-900">Upload Photo</span>
            </button>
            <button onClick={() => setUseCamera(true)} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-purple-200 bg-purple-50/50 rounded-2xl hover:bg-purple-50 transition-all">
              <FiCamera size={24} className="text-purple-600 mb-2" />
              <span className="font-semibold text-purple-900">Use Camera</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>
        ) : null}

        {/* LOADING: SCI-FI SCANNER EFFECT */}
        {loading && image ? (
          <div className="scanner-container aspect-video mb-6">
            <img src={image} className="scanner-image" alt="Scanning..." />
            <div className="scanner-line"></div>
            <div className="scanner-overlay"></div>
            <div className="scanner-text">
                <p className="text-blue-300 font-mono text-xl font-bold animate-pulse tracking-[0.2em]">ANALYZING...</p>
                <p className="text-blue-500 font-mono text-xs mt-2 tracking-widest">IDENTIFYING DEFECTS</p>
            </div>
          </div>
        ) : null}

        {/* RESULTS */}
        {result ? (
          <div className="bg-white rounded-2xl border-2 border-green-100 overflow-hidden shadow-sm animate-fadeIn">
            <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
              <FiCheckCircle className="text-green-600 text-xl" />
              <span className="font-bold text-green-800">Report Successfully Filed</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Issue Type</span>
                <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{result.type}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Location Details</span>
                <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "No GPS Data"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500">Severity</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${result.severity_score >= 7 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                  {result.severity_score}/10
                </span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] text-blue-400 uppercase font-bold mb-1 flex items-center gap-1"><FiAlertTriangle size={10} /> Recommended Action</p>
                <p className="font-bold text-blue-800 text-sm">{result.recommended_action}</p>
              </div>
              <button onClick={reset} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-transform active:scale-95">Submit Another Report</button>
            </div>
          </div>
        ) : !loading && (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100 mb-6 mt-6">
            <div className="flex items-center gap-3 overflow-hidden">
              <FiMapPin className={`text-gray-400 ${location?.address === 'Locating...' ? 'animate-pulse' : ''}`} />
              <p className="text-sm font-medium text-gray-700 truncate">{location?.address || "Detecting location..."}</p>
            </div>
            {location && location.address !== 'Locating...' && (
               <button onClick={handleGetLocation} className="text-xs font-bold text-white bg-gray-900 px-4 py-2 rounded-lg ml-2 hover:bg-black">UPDATE</button>
            )}
          </div>
        )}

        {!loading && !result && (
            <button onClick={handleAnalyze} disabled={!image || !location || location.address === 'Locating...'} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${image && location && location.address !== 'Locating...' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {image ? (location && location.address !== 'Locating...' ? 'Analyze & Submit Report' : 'Detecting Location...') : 'Select Photo to Start'}
            </button>
        )}
      </div>
    </div>
  );
};

export default UserApp;
