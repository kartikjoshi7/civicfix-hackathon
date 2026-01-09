export const API_BASE_URL = "http://localhost:9090"; // Change to your Cloud Run URL
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:9090";

export const SEVERITY_COLORS = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-green-100 text-green-800 border-green-300"
};

export const STATUS_COLORS = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  REJECTED: "bg-gray-100 text-gray-800"
};

export const ISSUE_TYPES = [
  "Pothole", "Garbage", "Streetlight", "Waterlogging", "Other", "None"
];