import os
import json
import uvicorn
import io
import logging
import random
import time
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from enum import Enum

# Third-party imports
from fastapi import FastAPI, UploadFile, HTTPException, Query, Form, File, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr

# Google GenAI imports
from google import genai
from google.genai import types

# Image processing
from PIL import Image

# Firebase imports
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# ==========================================
# 1. CONFIGURATION & SETUP
# ==========================================

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("CivicFixAPI")

# Initialize FastAPI App
app = FastAPI(
    title="CivicFix AI API",
    description="Backend for Smart City Infrastructure Reporting System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
# allowing all origins for development convenience
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. DATABASE & AI CLIENT INITIALIZATION
# ==========================================

# Initialize Firebase Firestore
db = None
try:
    if os.path.exists("firebase_credentials.json"):
        cred = credentials.Certificate("firebase_credentials.json")
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        logger.info("✅ Firebase Firestore Connected Successfully")
    else:
        logger.warning("⚠️ firebase_credentials.json not found! Database features will fail.")
except Exception as e:
    logger.error(f"❌ Firebase Connection Failed: {str(e)}")

# Initialize Google Gemini AI
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
client = None

if GEMINI_KEY:
    try:
        client = genai.Client(api_key=GEMINI_KEY)
        # Verify client initialization (lightweight check)
        logger.info(f"✅ Gemini AI Client Initialized (Key ends in ...{GEMINI_KEY[-4:]})")
    except Exception as e:
        logger.error(f"❌ Gemini Client Initialization Failed: {e}")
        client = None
else:
    logger.warning("⚠️ GEMINI_API_KEY not found in .env file. AI features will be disabled.")

# ==========================================
# 3. AI SYSTEM PROMPTS & CONFIG
# ==========================================

SYSTEM_PROMPT = """
You are an expert civil engineer and city infrastructure auditor. 
Your job is to analyze images submitted by citizens to identify infrastructure damage or civic issues.

Input: An image of a street, road, or public area.
Output: A strict JSON object. Do not include markdown formatting like ```json ... ```.

Required JSON Structure:
{
    "issue_detected": boolean, // True if a clear infrastructure defect exists
    "type": "Pothole" | "Garbage" | "Streetlight" | "Waterlogging" | "Cracked Road" | "Broken Pipe" | "Other" | "None",
    "severity_score": integer, // 1 (Minor) to 10 (Critical/Life Threatening)
    "danger_reason": "string", // A concise, technical explanation of the risk (max 20 words)
    "recommended_action": "Immediate Dispatch" | "Schedule Repair" | "Routine Maintenance" | "Ignore"
}

Analysis Rules:
1. Be strict. If the image is blurry, dark, or contains only people/selfies, set "issue_detected": false and "type": "None".
2. If multiple issues exist, prioritize the most dangerous one.
3. For "severity_score":
   - 1-3: Cosmetic damage, littering.
   - 4-6: Medium potholes, stagnant water.
   - 7-10: Open manholes, live wires, massive craters, blocked highways.
4. "danger_reason" must be professional (e.g., "Risk of vehicle axle damage" instead of "Bad for cars").
"""

# ==========================================
# 4. DATA MODELS (PYDANTIC)
# ==========================================

class ReportStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class StatusUpdate(BaseModel):
    status: ReportStatus = Field(..., description="The new status for the report")

class LocationData(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    issue_detected: bool
    type: str
    severity_score: int
    danger_reason: str
    recommended_action: str
    status: str
    timestamp: Union[str, datetime]
    location: Optional[dict] = None
    image_url: Optional[str] = None

class DashboardStats(BaseModel):
    total_reports: int
    today_reports: int
    active_reports: int
    resolved_reports: int
    avg_severity_score: float
    reports_by_type: Dict[str, int]
    reports_by_severity: Dict[str, int]

# ==========================================
# 5. UTILITY FUNCTIONS
# ==========================================

def clean_json_response(text: str) -> str:
    """Cleans AI response to ensure valid JSON string."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

# ==========================================
# 6. API ENDPOINTS
# ==========================================

@app.get("/", tags=["General"])
async def root():
    """Root endpoint to check API status."""
    return {
        "app": "CivicFix AI API",
        "version": "2.0.0",
        "status": "Running",
        "documentation": "/docs"
    }

@app.get("/health", tags=["General"])
async def health_check():
    """Health check for external monitoring tools."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ai": "connected" if client else "disconnected",
            "database": "connected" if db else "disconnected"
        }
    }

# ------------------------------------------
# AI Analysis Endpoint
# ------------------------------------------

@app.post("/analyze-image", tags=["AI Processing"])
async def analyze_image(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None)
):
    """
    Analyzes an uploaded image using Google Gemini 2.0 Flash.
    Saves the result to Firestore if an issue is detected.
    """
    start_time = time.time()
    logger.info(f"📸 Received image analysis request: {file.filename}")

    # 1. Validation
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="File must be an image")
    
    # Read file content
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(400, "Empty file submitted")
        
        # Check file size (approx 10MB limit)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(400, "Image too large. Max size is 10MB.")
            
    except Exception as e:
        logger.error(f"File read error: {e}")
        raise HTTPException(500, "Failed to process uploaded file")

    # 2. AI Analysis
    ai_result = {}
    ai_success = False

    if client:
        try:
            # Construct the Gemini Request
            user_message = types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text="Analyze this city infrastructure image according to the system instructions."),
                    types.Part.from_bytes(
                        data=content, 
                        mime_type=file.content_type
                    )
                ]
            )

            # Generate Content
            logger.info("🤖 Sending request to Gemini 2.0 Flash...")
            response = client.models.generate_content(
                model="gemini-2.0-flash", 
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.4, # Lower temperature for more deterministic JSON
                    max_output_tokens=1000
                ),
                contents=[user_message]
            )

            raw_text = response.text
            logger.debug(f"AI Raw Response: {raw_text[:200]}...")

            # Parse JSON
            json_text = clean_json_response(raw_text)
            ai_result = json.loads(json_text)
            ai_success = True
            logger.info(f"✅ AI Analysis Complete. Issue Detected: {ai_result.get('issue_detected')}")

        except json.JSONDecodeError as json_err:
            logger.error(f"❌ JSON Parse Error: {json_err}. Raw text: {raw_text}")
            ai_result = {
                "issue_detected": True,
                "type": "Parsing Error",
                "severity_score": 5,
                "danger_reason": "AI response was not valid JSON. Manual review needed.",
                "recommended_action": "Manual Review"
            }
        except Exception as e:
            logger.error(f"❌ AI Critical Error: {e}")
            ai_result = {
                "issue_detected": False,
                "error": str(e)
            }
    else:
        logger.warning("⚠️ AI Client not active. Returning mock response.")
        ai_result = {
            "issue_detected": False,
            "message": "AI service unavailable. Check API keys."
        }

    # 3. Database Saving
    saved_id = None
    if db and ai_result.get("issue_detected", False):
        try:
            # Construct document
            doc_data = {
                **ai_result,
                "status": "OPEN",
                "created_at": firestore.SERVER_TIMESTAMP, # Firestore server time
                "timestamp": datetime.now().isoformat(),  # Readable string time
                "filename": file.filename,
                "location": {
                    "lat": latitude,
                    "lng": longitude
                } if latitude and longitude else None,
                "source": "api_upload"
            }

            # Add to 'reports' collection
            update_time, ref = db.collection("reports").add(doc_data)
            saved_id = ref.id
            logger.info(f"💾 Report saved to Firestore with ID: {saved_id}")

        except Exception as db_err:
            logger.error(f"❌ Database Save Failed: {db_err}")
            # We don't raise an error here to return the AI result to user at least

    process_time = time.time() - start_time
    
    return {
        "status": "success",
        "processing_time_seconds": round(process_time, 2),
        "saved_to_db": saved_id is not None,
        "report_id": saved_id,
        "data": ai_result
    }

# ------------------------------------------
# Admin / Dashboard Endpoints
# ------------------------------------------

@app.get("/admin/reports", tags=["Admin"], response_model=Dict[str, Any])
async def get_all_reports(
    status: Optional[str] = Query(None, description="Filter: OPEN, IN_PROGRESS, RESOLVED"),
    issue_type: Optional[str] = Query(None, alias="type", description="Filter by Issue Type"),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Fetch list of reports for the Admin Dashboard.
    Supports filtering and limiting results.
    """
    if not db:
        raise HTTPException(503, "Database not connected")

    try:
        reports_ref = db.collection("reports")
        query_ref = reports_ref

        # Filters
        if status:
            query_ref = query_ref.where("status", "==", status)
        if issue_type:
            query_ref = query_ref.where("type", "==", issue_type)

        # Sorting: Newest first
        # Note: Requires composite index in Firestore if using multiple 'where' + 'order_by'
        # For simple usage without index creation, we sort in Python or use simple query
        try:
            query_ref = query_ref.order_by("created_at", direction=firestore.Query.DESCENDING)
        except Exception:
            # Fallback if index missing
            logger.warning("⚠️ Firestore index missing for sorting. Returning unsorted results.")

        docs = query_ref.limit(limit).stream()

        reports = []
        for doc in docs:
            r_data = doc.to_dict()
            r_data["id"] = doc.id
            
            # Sanitize timestamp for JSON response
            if "created_at" in r_data:
                # Firestore returns a specialized Datetime object
                dt = r_data["created_at"]
                if hasattr(dt, "isoformat"):
                    r_data["created_at"] = dt.isoformat()
                else:
                    r_data["created_at"] = str(dt)
            
            reports.append(r_data)

        return {
            "count": len(reports),
            "filters": {"status": status, "type": issue_type},
            "reports": reports
        }

    except Exception as e:
        logger.error(f"Fetch Reports Error: {e}")
        raise HTTPException(500, f"Internal Server Error: {str(e)}")

@app.get("/admin/reports/{report_id}", tags=["Admin"])
async def get_single_report(report_id: str):
    """Fetch details of a specific report ID."""
    if not db:
        raise HTTPException(503, "Database not connected")

    try:
        doc_ref = db.collection("reports").document(report_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(404, "Report not found")

        data = doc.to_dict()
        data["id"] = doc.id
        
        # Date serialization fix
        if "created_at" in data and hasattr(data["created_at"], "isoformat"):
            data["created_at"] = data["created_at"].isoformat()

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report {report_id}: {e}")
        raise HTTPException(500, str(e))

@app.patch("/admin/reports/{report_id}", tags=["Admin"])
async def update_report_status(report_id: str, update_data: StatusUpdate):
    """
    Update the status of a report (e.g., mark as RESOLVED).
    """
    if not db:
        raise HTTPException(503, "Database not connected")

    try:
        doc_ref = db.collection("reports").document(report_id)
        
        # 1. Verify existence
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(404, "Report not found")

        # 2. Update
        doc_ref.update({
            "status": update_data.status,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "last_modified_by": "admin_api" 
        })

        logger.info(f"Updated Report {report_id} to status: {update_data.status}")

        return {
            "success": True,
            "report_id": report_id,
            "new_status": update_data.status,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update failed: {e}")
        raise HTTPException(500, f"Update failed: {str(e)}")

@app.delete("/admin/reports/{report_id}", tags=["Admin"])
async def delete_report(report_id: str):
    """
    Delete a report permanently (e.g., spam or duplicates).
    """
    if not db:
        raise HTTPException(503, "Database not connected")

    try:
        db.collection("reports").document(report_id).delete()
        logger.info(f"Deleted Report {report_id}")
        return {"success": True, "message": "Report deleted successfully"}
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        raise HTTPException(500, str(e))

@app.get("/admin/stats", tags=["Admin"], response_model=DashboardStats)
async def get_dashboard_statistics():
    """
    Calculates aggregate statistics for the Admin Dashboard.
    Note: In production with millions of docs, use Firestore Aggregation Queries.
    For Hackathon scale, client-side counting is acceptable.
    """
    if not db:
        # Return empty structure if DB missing
        return DashboardStats(
            total_reports=0, today_reports=0, active_reports=0, 
            resolved_reports=0, avg_severity_score=0.0,
            reports_by_type={}, reports_by_severity={}
        )

    try:
        # Fetch all reports (Optimization: limit fields to save bandwidth)
        # reports = db.collection("reports").select(["status", "type", "severity_score", "timestamp"]).stream()
        reports = db.collection("reports").stream()

        stats = {
            "total": 0,
            "today": 0,
            "active": 0,
            "resolved": 0,
            "severity_sum": 0,
            "severity_count": 0,
            "types": {},
            "severities": {"high": 0, "medium": 0, "low": 0}
        }

        today_str = datetime.now().strftime("%Y-%m-%d")

        for doc in reports:
            data = doc.to_dict()
            stats["total"] += 1

            # Status Stats
            status = data.get("status", "OPEN")
            if status in ["OPEN", "IN_PROGRESS"]:
                stats["active"] += 1
            elif status == "RESOLVED":
                stats["resolved"] += 1

            # Today's Reports Check
            # Check various timestamp formats
            ts = data.get("timestamp")
            is_today = False
            if isinstance(ts, datetime):
                if ts.strftime("%Y-%m-%d") == today_str:
                    is_today = True
            elif isinstance(ts, str):
                if ts.startswith(today_str):
                    is_today = True
            
            if is_today:
                stats["today"] += 1

            # Type Stats
            r_type = data.get("type", "Unknown")
            stats["types"][r_type] = stats["types"].get(r_type, 0) + 1

            # Severity Stats
            try:
                score = int(data.get("severity_score", 0))
                if score > 0:
                    stats["severity_sum"] += score
                    stats["severity_count"] += 1
                    
                    if score >= 7:
                        stats["severities"]["high"] += 1
                    elif score >= 4:
                        stats["severities"]["medium"] += 1
                    else:
                        stats["severities"]["low"] += 1
            except:
                pass # Ignore non-integer severity

        # Calculate Average
        avg_score = 0.0
        if stats["severity_count"] > 0:
            avg_score = stats["severity_sum"] / stats["severity_count"]

        return DashboardStats(
            total_reports=stats["total"],
            today_reports=stats["today"],
            active_reports=stats["active"],
            resolved_reports=stats["resolved"],
            avg_severity_score=round(avg_score, 1),
            reports_by_type=stats["types"],
            reports_by_severity=stats["severities"]
        )

    except Exception as e:
        logger.error(f"Stats Calculation Error: {e}")
        raise HTTPException(500, "Failed to calculate statistics")

# ==========================================
# 7. DEVELOPMENT TOOLS
# ==========================================

@app.post("/admin/seed", tags=["Development"])
async def seed_database(count: int = 5):
    """
    Populates the database with dummy data for testing the dashboard.
    Only works in development mode.
    """
    if not db:
        raise HTTPException(503, "DB not connected")
    
    issues = ["Pothole", "Garbage", "Streetlight", "Waterlogging", "Cracked Road"]
    actions = ["Immediate Dispatch", "Schedule Repair", "Ignore"]
    
    generated_ids = []
    
    try:
        for i in range(count):
            issue_type = random.choice(issues)
            severity = random.randint(1, 10)
            
            # Create a fake timestamp within the last 7 days
            days_ago = random.randint(0, 7)
            fake_date = datetime.now() - timedelta(days=days_ago)
            
            dummy_data = {
                "issue_detected": True,
                "type": issue_type,
                "severity_score": severity,
                "danger_reason": f"Simulated {issue_type} risk for testing.",
                "recommended_action": random.choice(actions),
                "status": random.choice(["OPEN", "IN_PROGRESS", "RESOLVED"]),
                "created_at": fake_date,
                "timestamp": fake_date.isoformat(),
                "filename": f"demo_{i}.jpg",
                "source": "seed_script",
                "location": {
                    # Random coordinates around a central point (e.g., Gujarat/India)
                    "lat": 22.30 + (random.random() * 0.1),
                    "lng": 73.18 + (random.random() * 0.1)
                }
            }
            
            update_time, ref = db.collection("reports").add(dummy_data)
            generated_ids.append(ref.id)
            
        return {"message": f"Generated {count} dummy reports", "ids": generated_ids}
        
    except Exception as e:
        raise HTTPException(500, f"Seed failed: {e}")

# ==========================================
# 8. SERVER ENTRY POINT
# ==========================================

if __name__ == "__main__":
    # Get port from environment or default to 9090
    port = int(os.environ.get("PORT", 9090))
    
    print("\n" + "="*50)
    print("   🚀 CIVICFIX AI BACKEND SERVER STARTING")
    print("="*50)
    print(f"📡 PORT     : {port}")
    print(f"🤖 AI KEY   : {'LOADED ✅' if GEMINI_KEY else 'MISSING ❌'}")
    print(f"🔥 FIREBASE : {'CONNECTED ✅' if db else 'DISCONNECTED ❌'}")
    print("="*50 + "\n")
    
    # Run Uvicorn Server
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True, # Enable auto-reload for development
        log_level="info"
    )