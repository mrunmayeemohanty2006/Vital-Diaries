# 🩺 Vital Diaries

> **Zero-Knowledge Decentralized Health Tracker & Lab Insights Platform**  
> Local-first client cryptographic vault (AES-256-GCM) with OCR extraction and Django REST Framework backend for identity, audit logging, and multi-device synchronization.

---

## 🏛 Architecture Overview

```
vital-diaries/
├── backend/                  # Python & Django REST Framework Backend
│   ├── accounts/             # User accounts & session management
│   ├── devices/              # Device registration & authorization
│   ├── activity/             # Security activity logs
│   ├── config/               # Django settings, WSGI, ASGI, URLs
│   ├── manage.py             # Django management CLI
│   └── requirements.txt      # Python dependencies
├── src/                      # React 19 + TypeScript Frontend
│   ├── components/           # UI components (Health reports, Trends, Analytics)
│   ├── lib/                  # Cryptography (AES-256-GCM), OCR parsing, API client
│   └── types/                # TypeScript interface definitions
├── server.ts                 # Full-stack Node/Express reverse proxy & Vite gateway
└── package.json              # Node dependencies & automation scripts
```

---

## 🚀 Quick Start for Contributors / Forks

### **1. Prerequisites**
- **Node.js** (v18 or v20+)
- **Python** (3.10, 3.11, or 3.12+)

---

### **2. Clone & Setup**

```bash
# Clone the repository
git clone https://github.com/mrunmayeemohanty2006/Vital-Diaries.git
cd Vital-Diaries

# Install frontend dependencies
npm install

# Setup backend Python environment
cd backend
python3 -m venv venv
source venv/bin/activate       # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
cd ..
```

---

### **3. Run the Full Stack App**

Start both the Express/Vite frontend and the Django backend simultaneously:

```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5174` (or `5173`)
- **API Health Check**: `http://localhost:5174/api/health`
- **Django Backend Direct**: `http://localhost:8000/api/auth/`
- **Django Admin Portal**: `http://localhost:5174/admin/`

---

## 🛠 Working on the Backend

When making changes to the backend in `backend/`:

### Create a Superuser / Admin
```bash
cd backend
source venv/bin/activate
python manage.py createsuperuser
```

### Database Migrations
When modifying models in `backend/accounts/models.py`, `backend/devices/models.py`, or `backend/activity/models.py`:
```bash
cd backend
source venv/bin/activate
python manage.py makemigrations
python manage.py migrate
```

### Run Test Suites
```bash
# Run Django backend test suite
cd backend && python manage.py test

# Run frontend, crypto, and OCR regression test suites
npm test
```

---

## 🌐 Deploying to Production

### **1. Backend (Render / Railway / Fly.io)**
1. Connect your repository to [Render.com](https://render.com).
2. Create a **Web Service** with:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command**: `gunicorn config.wsgi:application`
   - **Environment Variables**:
     - `DJANGO_DEBUG=False`
     - `DJANGO_ALLOWED_HOSTS=.onrender.com,localhost`
     - `DJANGO_SECRET_KEY=<your-secret-key>`

### **2. Frontend (GitHub Pages / Vercel)**
- The frontend is configured for automatic deployment to **GitHub Pages** via GitHub Actions in `.github/workflows/deploy.yml`.
- It operates with zero-knowledge cryptographic vaults locally in the browser, seamlessly communicating with the Django backend.
