import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as XLSX from 'xlsx';
// ⭐ NEW: Imported MarkerF and InfoWindowF for React 18 support
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'; 
import { 
  FiFilter, FiSearch, FiCheckCircle, FiTrash2, FiMapPin, 
  FiCalendar, FiAlertTriangle, FiLoader, FiDownload, FiEyeOff, FiExternalLink,
  FiDroplet, FiZap, FiTarget, FiAlertCircle, FiList, FiMap 
} from 'react-icons/fi';

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); 
  const [sortOrder, setSortOrder] = useState('newest'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  
  // ⭐ NEW: State to track which pin is clicked
  const [selectedReport, setSelectedReport] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '1rem' };
  const defaultCenter = { lat: 22.3, lng: 73.2 }; 

  // --- HELPERS ---
  const parseDate = (val) => {
    if (!val) return new Date(0);
    if (val.toDate) return val.toDate();
    return new Date(val);
  };

  const timeAgo = (dateVal) => {
    if (!dateVal) return 'Unknown';
    const date = parseDate(dateVal);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getReportIcon = (report) => {
    if (report.status === 'RESOLVED') return <FiCheckCircle size={32} className="text-green-500" />;
    const type = report.type?.toLowerCase() || '';
    if (type.includes('water') || type.includes('flood')) return <FiDroplet size={32} className="text-blue-400" />;
    if (type.includes('light') || type.includes('electric')) return <FiZap size={32} className="text-yellow-400" />;
    if (type.includes('pothole') || type.includes('road')) return <FiTarget size={32} className="text-gray-400" />;
    return <FiAlertCircle size={32} className="text-orange-400" />;
  };

  const formatCoords = (loc) => {
    if (!loc?.coordinates && (!loc?.lat || !loc?.lng)) return '';
    const lat = loc.coordinates?.lat || loc.lat;
    const lng = loc.coordinates?.lng || loc.lng;
    return `(${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})`;
  };

  const getCoordinates = (report) => {
    const lat = parseFloat(report.location?.coordinates?.lat || report.location?.lat);
    const lng = parseFloat(report.location?.coordinates?.lng || report.location?.lng);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    return null;
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    const ref = collection(db, 'reports');
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      reportsData.sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
      setReports(reportsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getSeverity = (r) => r.severity_score || r.severityScore || 0;
  const validReports = reports.filter(r => getSeverity(r) >= 2);

  const updateStatus = async (id, newStatus) => {
    try { await updateDoc(doc(db, 'reports', id), { status: newStatus }); } catch (e) { alert("Error"); }
  };

  const deleteReport = async (id) => {
    if (window.confirm("Delete permanent?")) await deleteDoc(doc(db, 'reports', id));
  };

  const handleExport = () => {
    const data = filteredReports.map(r => ({
      "Type": r.type, "Severity": getSeverity(r), "Status": r.status,
      "Address": r.location?.address, "Coordinates": formatCoords(r.location),
      "Risk": r.dangerReason || r.danger_reason, "Action": r.recommendedAction || r.recommended_action
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, `CivicFix_Export.xlsx`);
  };

  const getFilteredReports = () => {
    let result = validReports.filter(report => {
      const score = getSeverity(report);
      if (filter === 'OPEN' && report.status !== 'OPEN') return false;
      if (filter === 'RESOLVED' && report.status !== 'RESOLVED') return false;
      if (filter === 'CRITICAL' && score < 8) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return report.type?.toLowerCase().includes(t) || report.location?.address?.toLowerCase().includes(t);
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortOrder === 'severity_desc') return getSeverity(b) - getSeverity(a);
      return sortOrder === 'oldest' ? parseDate(a.createdAt) - parseDate(b.createdAt) : parseDate(b.createdAt) - parseDate(a.createdAt);
    });
    return result;
  };

  const filteredReports = getFilteredReports();

  const getSeverityBadge = (score) => {
    if (score >= 8) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  if (loading) return <div className="flex justify-center p-20"><FiLoader className="animate-spin text-4xl text-blue-600" /></div>;

  return (
    <div className="space-y-8 pb-10">
      
      {/* STATS HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-400 text-xs uppercase font-bold">Total</p>
          <p className="text-3xl font-black text-gray-800 mt-1">{validReports.length}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100">
          <p className="text-red-400 text-xs uppercase font-bold">Critical</p>
          <p className="text-3xl font-black text-red-600 mt-1">{validReports.filter(r => getSeverity(r) >= 8 && r.status === 'OPEN').length}</p>
        </div>
        <div className="bg-blue-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <p className="text-blue-400 text-xs uppercase font-bold">Active</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{validReports.filter(r => r.status === 'OPEN').length}</p>
        </div>
        <div className="bg-green-50 p-5 rounded-2xl shadow-sm border border-green-100">
          <p className="text-green-500 text-xs uppercase font-bold">Fixed</p>
          <p className="text-3xl font-black text-green-600 mt-1">{validReports.filter(r => r.status === 'RESOLVED').length}</p>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2">
          {['ALL', 'OPEN', 'CRITICAL', 'RESOLVED'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{f}</button>
          ))}
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                <FiList /> List
            </button>
            <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
                <FiMap /> Map
            </button>
        </div>

        <div className="flex gap-3 w-full lg:w-auto">
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-full" />
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm"><FiDownload /> Excel</button>
        </div>
      </div>

      {/* VIEW CONTENT */}
      {viewMode === 'list' ? (
        // --- LIST VIEW ---
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {filteredReports.length === 0 ? <div className="text-center py-20 text-gray-400">No reports found.</div> : (
            <div className="divide-y divide-gray-100">
                {filteredReports.map((report) => {
                const severity = getSeverity(report);
                return (
                    <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col lg:flex-row gap-6">
                        <div className="w-full lg:w-48 h-40 bg-gray-50 rounded-xl flex-shrink-0 flex flex-col items-center justify-center border border-gray-100 text-gray-400">
                            {getReportIcon(report)}
                            <p className="text-[10px] mt-2 font-medium uppercase tracking-wider">{report.type}</p>
                        </div>
                        <div className="flex-grow">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getSeverityBadge(severity)}`}>Severity: {severity}/10</span>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${report.status === 'OPEN' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>{report.status}</span>
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1"><FiCalendar /> {timeAgo(report.createdAt)}</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{report.type}</h3>
                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-gray-500 mb-4">
                                <div className="flex items-center gap-1"><FiMapPin className="text-red-400" /> <span>{report.location?.address || 'Unknown'}</span></div>
                                <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{formatCoords(report.location)}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                                <div><p className="text-[10px] uppercase font-bold text-gray-400">Risk</p><p className="text-gray-800">{report.dangerReason || report.danger_reason || "Pending..."}</p></div>
                                <div><p className="text-[10px] uppercase font-bold text-gray-400">Action</p><p className="text-blue-700 font-semibold">{report.recommendedAction || report.recommended_action || "Review Needed"}</p></div>
                            </div>
                        </div>
                        <div className="flex lg:flex-col justify-end gap-2 lg:border-l lg:border-gray-100 lg:pl-6">
                            {report.status !== 'RESOLVED' && <button onClick={() => updateStatus(report.id, 'RESOLVED')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-bold text-xs"><FiCheckCircle /> Resolve</button>}
                            <button onClick={() => deleteReport(report.id)} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 font-bold text-xs"><FiTrash2 /> Delete</button>
                        </div>
                    </div>
                );
                })}
            </div>
            )}
        </div>
      ) : (
        // --- ⭐ GOOGLE MAP VIEW (Fixed for React 18) ⭐ ---
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-[600px] relative z-0">
            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={defaultCenter}
                    zoom={10}
                >
                    {filteredReports.map((report) => {
                        const coords = getCoordinates(report);
                        if (coords) {
                            // ⭐ Changed Marker to MarkerF for React 18 support
                            return (
                                <MarkerF 
                                    key={report.id} 
                                    position={coords}
                                    onClick={() => setSelectedReport(report)} 
                                />
                            );
                        }
                        return null;
                    })}

                    {/* ⭐ Info Window (Popup) */}
                    {selectedReport && (
                        <InfoWindowF
                            position={getCoordinates(selectedReport)}
                            onCloseClick={() => setSelectedReport(null)}
                        >
                            <div className="p-2 min-w-[200px]">
                                <h3 className="font-bold text-sm mb-1">{selectedReport.type}</h3>
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{selectedReport.location?.address}</p>
                                
                                <div className="flex gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${getSeverity(selectedReport) >= 8 ? 'bg-red-500' : 'bg-orange-400'}`}>
                                        Sev: {getSeverity(selectedReport)}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                        {selectedReport.status}
                                    </span>
                                </div>

                                <button 
                                    onClick={() => {
                                        window.open(`http://maps.google.com/maps?q=${getCoordinates(selectedReport).lat},${getCoordinates(selectedReport).lng}`, '_blank');
                                    }}
                                    className="text-xs text-blue-600 font-bold hover:underline"
                                >
                                    Open in Google Maps
                                </button>
                            </div>
                        </InfoWindowF>
                    )}
                </GoogleMap>
            ) : (
                <div className="flex h-full items-center justify-center bg-gray-50 text-gray-400 font-bold animate-pulse">
                    <FiMapPin className="mr-2" /> Loading Google Maps...
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;