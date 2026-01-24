import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiFilter, FiSearch, FiCheckCircle, FiTrash2, FiMapPin, FiCalendar, FiAlertTriangle, FiLoader, FiXCircle } from 'react-icons/fi';

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, OPEN, HIGH, RESOLVED
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. REAL-TIME DATA FETCHING (Direct from Firebase) ---
  useEffect(() => {
    // This connects directly to your database, bypassing the local backend
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    
    // onSnapshot listens for changes instantly
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. ACTIONS (Resolve / Delete) ---
  const updateStatus = async (id, newStatus) => {
    try {
      const reportRef = doc(db, 'reports', id);
      await updateDoc(reportRef, { status: newStatus });
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const deleteReport = async (id) => {
    if (window.confirm("Are you sure you want to delete this report? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'reports', id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  // --- 3. FILTERING & SORTING LOGIC ---
  const getFilteredReports = () => {
    return reports.filter(report => {
      // 1. Status Filter
      if (filter === 'OPEN' && report.status !== 'OPEN') return false;
      if (filter === 'RESOLVED' && report.status !== 'RESOLVED') return false;
      if (filter === 'HIGH' && report.severityScore < 7) return false;

      // 2. Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          report.type?.toLowerCase().includes(term) ||
          report.location?.address?.toLowerCase().includes(term) ||
          report.id.toLowerCase().includes(term)
        );
      }
      return true;
    }).sort((a, b) => {
      // 3. Priority Sort: Show High Severity first if viewing All or Open
      if (filter === 'ALL' || filter === 'OPEN') {
        // If one is OPEN and other is not, prioritize OPEN
        if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
        if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
        // Then sort by Severity (Highest first)
        return (b.severityScore || 0) - (a.severityScore || 0);
      }
      return 0; // Default is time-sorted (from Firestore query)
    });
  };

  const filteredReports = getFilteredReports();

  // Helper for Badge Colors
  const getSeverityBadge = (score) => {
    if (score >= 8) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusBadge = (status) => {
    return status === 'OPEN' 
      ? 'bg-blue-100 text-blue-700 border-blue-200' 
      : 'bg-gray-100 text-gray-600 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center gap-3">
          <FiLoader className="animate-spin text-4xl text-blue-600" />
          <p className="text-gray-500 font-medium">Loading Dashboard Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* 1. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Total Reports</p>
          <p className="text-3xl font-black text-gray-800 mt-1">{reports.length}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-400 text-xs uppercase font-bold tracking-wider">Critical Issues</p>
              <p className="text-3xl font-black text-red-600 mt-1">
                {reports.filter(r => r.severityScore >= 8 && r.status === 'OPEN').length}
              </p>
            </div>
            <FiAlertTriangle className="text-red-300 text-2xl" />
          </div>
        </div>
        <div className="bg-blue-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <p className="text-blue-400 text-xs uppercase font-bold tracking-wider">Open Tickets</p>
          <p className="text-3xl font-black text-blue-600 mt-1">
            {reports.filter(r => r.status === 'OPEN').length}
          </p>
        </div>
        <div className="bg-green-50 p-5 rounded-2xl shadow-sm border border-green-100">
          <p className="text-green-500 text-xs uppercase font-bold tracking-wider">Resolved</p>
          <p className="text-3xl font-black text-green-600 mt-1">
            {reports.filter(r => r.status === 'RESOLVED').length}
          </p>
        </div>
      </div>

      {/* 2. CONTROLS BAR */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        <div className="flex gap-1 overflow-x-auto p-1">
          {['ALL', 'OPEN', 'HIGH', 'RESOLVED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f === 'HIGH' ? '🔥 High Priority' : f === 'ALL' ? 'All Reports' : f}
            </button>
          ))}
        </div>
        <div className="relative p-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search city, issue type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
          />
        </div>
      </div>

      {/* 3. REPORTS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiFilter className="text-gray-300 text-2xl" />
            </div>
            <p className="text-gray-500 font-medium">No reports found matching your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-6">
                
                {/* Image Placeholder / Actual Image */}
                <div className="w-full md:w-48 h-32 bg-gray-200 rounded-xl flex-shrink-0 overflow-hidden">
                   {/* This placeholder shows up if no image is stored. 
                       If you have image URLs in your reports, change the div below to <img src={report.imageUrl} /> */}
                   <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 border border-gray-200">
                     <FiCheckCircle size={24} />
                   </div>
                </div>

                {/* Content */}
                <div className="flex-grow">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getSeverityBadge(report.severityScore)}`}>
                      Severity: {report.severityScore}/10
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <FiCalendar /> {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown Date'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">{report.type}</h3>
                  
                  <div className="flex items-start gap-2 text-sm text-gray-500 mb-4">
                    <FiMapPin className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{report.location?.address || 'Location data unavailable'}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Risk Assessment</p>
                      <p className="text-gray-700 leading-snug">{report.dangerReason || "Analysis pending..."}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Govt Action Plan</p>
                      <p className="text-blue-700 font-semibold leading-snug">{report.recommendedAction || "Under review"}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col justify-end gap-2 md:border-l md:border-gray-100 md:pl-6">
                  {report.status !== 'RESOLVED' && (
                    <button 
                      onClick={() => updateStatus(report.id, 'RESOLVED')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm transition-all shadow-sm hover:shadow-md"
                    >
                      <FiCheckCircle /> Resolve
                    </button>
                  )}
                  <button 
                    onClick={() => deleteReport(report.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-bold text-sm transition-colors"
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;