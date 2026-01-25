# 🏙️ CivicFix – Smart City Infrastructure Reporting System

**Empowering Citizens, Enabling Authorities.**
An AI-powered platform for real-time urban infrastructure monitoring and reporting. Built for **DUHacks 5.0 2026**.

---

## 📖 Overview

CivicFix bridges the gap between citizens and municipal authorities. Instead of navigating complex government portals, citizens simply snap a photo of a pothole, broken streetlight, or garbage dump.

Our AI Engine (**Google Gemini 2.0**) instantly analyzes the image to:

* Verify authenticity (filters out fake/AI-generated spam)
* Classify the issue (Pothole, Waterlogging, Accident, etc.)
* Assess severity (1–10 scale)
* Extract location (GPS coordinates)

---

## 🚀 Live Demo

* **Live URL:** [https://civicfix-frontend-nykz.onrender.com](https://civicfix-frontend-nykz.onrender.com)
---

## 🔐 Test Credentials

Please use these credentials to explore the different roles in the application.

### 👤 Citizen (User)

* **Email:** [citizen@gmail.com](mailto:citizen@gmail.com)
* **Password:** user123

**Features:**

* Report issues
* View history
* Geolocation tracking

**Note:** Limited to 5 reports per day to avoid spam reporting.

---

### 🛡️ City Official (Admin)

* **Email:** [admin@city.gov](mailto:admin@city.gov)
* **Password:** admin123

**Features:**

* View global map
* Change report status (Open → Resolved)
* Analytics dashboard

---

## ✨ Key Features

### 📱 For Citizens (Frontend)

* 📸 **AI-Powered Reporting:** Upload a photo, and Gemini AI auto-detects the problem. No typing needed.
* 📍 **Auto-Geolocation:** Automatically grabs GPS coordinates for precise tracking.
* 🛡️ **Secure Login:** Protected by Google reCAPTCHA v2 to prevent bot attacks.
* 🚦 **Spam Protection:** Intelligent rate limiting (max 5 reports/day) to prevent system abuse.
* 🔐 **Account Recovery:** Built-in "Forgot Password" flow via Firebase Auth.

---

### 💻 For Authorities (Admin Dashboard)

* 📊 **Live Dashboard:** Real-time feed of incoming reports.
* 🗺️ **Smart Analytics:** Auto-priority scoring based on AI severity assessment.
* ✅ **Workflow Management:** Update status from "Reported" to "In Progress" or "Resolved".

---

## 🛠️ Tech Stack

| Component  | Technology                                     |
| ---------- | ---------------------------------------------- |
| Frontend   | React.js, Tailwind CSS, Vite, Framer Motion    |
| Backend    | Python, FastAPI, Uvicorn                       |
| AI Model   | Google Gemini 2.0 Flash (via Google GenAI SDK) |
| Database   | Firebase Firestore (NoSQL)                     |
| Auth       | Firebase Authentication + Google reCAPTCHA v2  |
| Deployment | Render (Web Service & Static Site)             |

---

## 🔮 Future Scope

* **Offline Mode:** Allow capturing reports without internet and syncing later.
* **Community Voting:** Allow citizens to upvote critical issues for faster resolution.
* **WhatsApp Integration:** Report issues via a WhatsApp chatbot.

---

Made with ❤️ for **DUHacks 5.0**
