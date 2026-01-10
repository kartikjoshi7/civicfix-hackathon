import os
import json
import uvicorn
import io
from fastapi import FastAPI, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="CivicFix AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase
db = None
try:
    cred = credentials.Certificate("firebase_credentials.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase Connected")
except:
    print("⚠️ Firebase Not Connected")

# Gemini AI - USE YOUR KEY
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
client = None

if GEMINI_KEY:
    try:
        client = genai.Client(api_key=GEMINI_KEY)
        print(f"✅ Gemini AI Connected (Key: {GEMINI_KEY[:15]}...)")
    except Exception as e:
        print(f"❌ Gemini Failed: {e}")
        client = None
else:
    print("⚠️ No Gemini Key")

SYSTEM_PROMPT = """You are a city infrastructure expert. Analyze images for civic issues.
Return ONLY JSON with these keys:
- "issue_detected": boolean
- "type": "Pothole" | "Garbage" | "Streetlight" | "Waterlogging" | "Other" | "None"
- "severity_score": 1-10
- "danger_reason": short explanation
- "recommended_action": "Immediate Dispatch" | "Schedule Repair" | "Ignore"

Rules:
1. Only report clear infrastructure issues
2. Animals/people/selfies = issue_detected: false
3. Clean roads = no issue
4. Be critical but accurate"""

# Pydantic model for status update
class StatusUpdate(BaseModel):
    status: str

@app.get("/")
async def root():
    return {"message": "CivicFix AI API", "ai_enabled": client is not None}

@app.get("/health")
async def health():
    return {
        "ai": "enabled" if client else "disabled",
        "firebase": "connected" if db else "disconnected"
    }

@app.post("/analyze-image")
async def analyze_image(file: UploadFile):
    print(f"📸 Analyzing: {file.filename}")
    
    try:
        # Read image
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(400, "Empty file")
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(content))
        
        # Use AI if available
        # Use AI if available
        if client:
            try:
                # 1. Manually package the "User" message to fix the 400 Error
                # We use the raw 'content' bytes we read earlier
                user_message = types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text="Analyze this city image:"),
                        types.Part.from_bytes(
                            data=content, 
                            mime_type=file.content_type or "image/jpeg"
                        )
                    ]
                )

                # 2. Call Gemini with the structured message
                response = client.models.generate_content(
                    model="gemini-2.0-flash", # Use 1.5 for stability
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.3
                    ),
                    contents=[user_message] # Pass the list containing our structured message
                )
                
                print(f"🤖 AI Response: {response.text[:100]}...")
                
                # Extract JSON
                text = response.text.strip()
                if "json" in text:
                    text = text.replace("json", "").replace("```", "").strip()
                
                data = json.loads(text)
                
            except Exception as ai_error:
                print(f"❌ AI Error: {ai_error}")
                # Fallback to test data
                data = {
                    "issue_detected": True,
                    "type": "Manual Review",
                    "severity_score": 5,
                    "danger_reason": "AI failed - needs human review",
                    "recommended_action": "Schedule Repair"
                }
        
        # Save to DB
        if db and data.get("issue_detected"):
            try:
                # Add status field if not present
                if "status" not in data:
                    data["status"] = "OPEN"
                    
                db.collection("reports").add({
                    **data,
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "filename": file.filename
                })
                print("💾 Saved to DB")
            except Exception as db_error:
                print(f"⚠️ DB Save failed: {db_error}")
        
        return {
            "status": "success",
            "ai_used": client is not None,
            "data": data
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

# ============== ADMIN ENDPOINTS ==============

@app.get("/admin/reports")
async def get_all_reports(
    status: Optional[str] = Query(None, description="Filter by status: OPEN, IN_PROGRESS, RESOLVED"),
    issue_type: Optional[str] = Query(None, alias="type", description="Filter by issue type"),
    limit: int = Query(50, description="Number of reports to return")
):
    """Admin endpoint to fetch all reports with filters"""
    if not db:
        return {"error": "Database not connected", "reports": []}
    
    try:
        query = db.collection("reports")
        
        # Apply filters
        if status:
            query = query.where("status", "==", status)
        if issue_type:
            query = query.where("type", "==", issue_type)
        
        # Execute query
        docs = query.limit(limit).order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
        
        reports = []
        for doc in docs:
            report_data = doc.to_dict()
            report_data["id"] = doc.id
            
            # Convert Firestore timestamp to ISO format
            if "timestamp" in report_data:
                timestamp = report_data["timestamp"]
                if hasattr(timestamp, "isoformat"):
                    report_data["timestamp"] = timestamp.isoformat()
                elif hasattr(timestamp, "strftime"):
                    report_data["timestamp"] = timestamp.strftime("%Y-%m-%dT%H:%M:%S")
            
            reports.append(report_data)
        
        return {
            "count": len(reports),
            "reports": reports
        }
        
    except Exception as e:
        print(f"❌ Error fetching reports: {e}")
        return {"error": str(e), "reports": []}

@app.get("/admin/stats")
async def get_dashboard_stats():
    """Admin dashboard statistics"""
    if not db:
        return {
            "total_reports": 0,
            "today_reports": 0,
            "reports_by_type": {},
            "reports_by_severity": {"high": 0, "medium": 0, "low": 0},
            "avg_severity_score": 0
        }
    
    try:
        # Get all reports
        docs = db.collection("reports").stream()
        
        total_reports = 0
        today_reports = 0
        reports_by_type = {}
        severity_scores = []
        
        # Get current date for today's reports
        today = datetime.now().date()
        
        for doc in docs:
            total_reports += 1
            data = doc.to_dict()
            
            # Check if report is from today
            if "timestamp" in data:
                timestamp = data["timestamp"]
                if hasattr(timestamp, "date"):
                    if timestamp.date() == today:
                        today_reports += 1
                elif isinstance(timestamp, str) and today.isoformat()[:10] in timestamp:
                    today_reports += 1
            
            # Count by type
            issue_type = data.get("type", "Unknown")
            reports_by_type[issue_type] = reports_by_type.get(issue_type, 0) + 1
            
            # Collect severity scores
            severity = data.get("severity_score", 0)
            if severity:
                severity_scores.append(severity)
        
        # Calculate severity distribution
        high = len([s for s in severity_scores if s >= 7])
        medium = len([s for s in severity_scores if 4 <= s < 7])
        low = len([s for s in severity_scores if s < 4])
        
        # Calculate average severity
        avg_severity = sum(severity_scores) / len(severity_scores) if severity_scores else 0
        
        return {
            "total_reports": total_reports,
            "today_reports": today_reports,
            "reports_by_type": reports_by_type,
            "reports_by_severity": {
                "high": high,
                "medium": medium,
                "low": low
            },
            "avg_severity_score": round(avg_severity, 1)
        }
        
    except Exception as e:
        print(f"❌ Error getting stats: {e}")
        return {
            "total_reports": 0,
            "today_reports": 0,
            "reports_by_type": {},
            "reports_by_severity": {"high": 0, "medium": 0, "low": 0},
            "avg_severity_score": 0
        }

@app.patch("/admin/reports/{report_id}")
async def update_report_status(report_id: str, update: StatusUpdate):
    """Update report status (OPEN, IN_PROGRESS, RESOLVED)"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    valid_statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]
    if update.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Status must be one of: {', '.join(valid_statuses)}"
        )
    
    try:
        report_ref = db.collection("reports").document(report_id)
        
        # Check if report exists
        report = report_ref.get()
        if not report.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Update status
        report_ref.update({
            "status": update.status,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        # Get updated report
        updated_report = report_ref.get()
        
        return {
            "success": True, 
            "message": f"Report {report_id} updated to {update.status}",
            "report": updated_report.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating report: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating report: {e}")

@app.get("/admin/reports/{report_id}")
async def get_report_by_id(report_id: str):
    """Get specific report by ID"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    try:
        report_ref = db.collection("reports").document(report_id)
        report = report_ref.get()
        
        if not report.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report_data = report.to_dict()
        report_data["id"] = report_id
        
        # Format timestamp
        if "timestamp" in report_data:
            timestamp = report_data["timestamp"]
            if hasattr(timestamp, "isoformat"):
                report_data["timestamp"] = timestamp.isoformat()
        
        return report_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching report: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching report: {e}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9090))  # Render provides PORT
    print(f"\n🚀 CivicFix AI Server")
    print(f"📡 Port: {port}")
    print(f"🤖 AI: {'ENABLED' if client else 'DISABLED'}")
    print(f"🔥 Firebase: {'CONNECTED' if db else 'NOT CONNECTED'}")
    print()
    uvicorn.run(app, host="0.0.0.0", port=port)

    
