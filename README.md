# Blindspot — Supply Chain Control Tower & Bottleneck Radar

> **See every delay. Find the cause. Fix the process.**

Blindspot is an enterprise-grade Supply Chain Control Tower SaaS designed to track orders across multi-stage fulfillment, detect bottleneck delays in real-time, enforce role-based accountability, log root-cause delay reasons, and verify whether systemic corrective actions improve logistics reliability.

---

## 🎯 The 6 Core Supply Chain Questions Answered by Blindspot

1. **Where is an order delayed?** Pinpoints the exact workflow station (`CONFIRMATION`, `PACKAGING`, `DOCUMENTATION`, or `DELIVERY`).
2. **How long has it been delayed?** Calculates elapsed duration vs. stage SLA deadline down to the minute.
3. **Why is it delayed?** Categorizes standardized root causes (e.g. *Material Shortage*, *Customs Hold*, *Equipment Breakdown*).
4. **Who is responsible for the next action?** Assigns role-based ownership (`CONFIRM`, `PACK`, `DOC`, `DEL`, or `ADMIN`).
5. **What corrective action should be taken?** Logs preventive process interventions with designated owners and targets.
6. **Did the corrective action improve performance?** Tracks pre- vs. post-intervention delay rates to quantify measurable process impact.

---

## 🏗️ Architecture & Technology Stack

- **Runtime & Backend:** Node.js (v20+ LTS, ESM modules) + Express.js.
- **Security:** `helmet` (Strict Content Security Policy), `cors`, `cookie-parser` (HTTP-only session cookies), and `express-rate-limit`.
- **Database & Identity:** Google Cloud Firestore + Firebase Authentication + Firebase Admin SDK.
- **Validation:** Strict runtime data validation via `zod`.
- **Frontend:** Pure Vanilla HTML5 & Modern Vanilla CSS (Design System tokens, glassmorphism, responsive control tower grid, zero bulky build steps).
- **Testing:** Node.js native test runner (`node:test` & `node:assert`).

---

## 📁 Repository Structure

```
Blindspot/
├── .env.example               # Environment variables blueprint
├── firestore.rules            # Firestore security rules (RBAC least privilege)
├── firestore.indexes.json     # Composite query indexes for Firestore
├── package.json               # Dependencies and runner scripts
├── README.md                  # Complete operator and developer manual
├── scripts/
│   ├── bootstrap-admin.js     # Admin account creation & bootstrap CLI
│   └── seed-stage-policies.js # SLA threshold and demo seed script
├── src/
│   ├── app.js                 # Express app, middleware pipeline & routing
│   ├── server.js              # HTTP server & graceful shutdown handling
│   ├── config/
│   │   ├── environment.js     # Env var parser & validation
│   │   └── firebase.js        # Firebase Admin SDK initialization
│   ├── constants/             # Enums: ROLES, STAGES, DELAY_REASONS
│   ├── middleware/            # authenticate, authorize, rate-limit, error-handler
│   ├── routes/                # auth, public, package, workflow, employee, report, action, settings
│   ├── services/              # delay, package, workflow, employee, report, action
│   ├── utils/                 # CSV safe sanitizer, date ranges, pagination
│   └── validators/            # Zod schemas for all API payloads
├── views/                     # UI Views (HTML5)
│   ├── dashboard.html         # Public supply chain radar
│   ├── login.html             # Employee authentication
│   ├── admin.html             # Executive Control Center & order intake
│   ├── confirm.html           # Stage 1: Confirmation portal
│   ├── pack.html              # Stage 2: Packaging portal
│   ├── doc.html               # Stage 3: Documentation & dispatch portal
│   ├── del.html               # Stage 4: Delivery portal
│   ├── package-details.html   # Package deep-dive & audit timeline
│   ├── employees.html         # Staff roster & RBAC role manager
│   ├── reports.html           # Bottleneck analytics & CSV export
│   ├── actions.html           # Corrective action verification
│   ├── settings.html          # SLA thresholds configuration
│   ├── access-denied.html     # 403 Forbidden
│   └── not-found.html         # 404 Not Found
├── public/
│   ├── css/main.css           # Control Tower Design System stylesheet
│   └── js/                    # Modular ES6 client controllers
└── tests/                     # Automated test suites
    ├── auth.test.js
    ├── delays.test.js
    ├── permissions.test.js
    ├── reports.test.js
    └── workflow.test.js
```

---

## 🚀 Beginner-Friendly Quick Start Guide

### Step 1: Install Node.js LTS
Download and install **Node.js 20+ LTS** from [nodejs.org](https://nodejs.org/).
Verify installation in your terminal:
```bash
node -v
npm -v
```

### Step 2: Clone & Install Dependencies
Open your terminal (Terminal on macOS/Linux or PowerShell on Windows):
```bash
git clone <repository_url> BlindSpot
cd BlindSpot
npm install
```

### Step 3: Firebase Setup
1. Visit the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**. Name it `blindspot-logistics`.
2. Navigate to **Authentication** &rarr; **Sign-in method** &rarr; Enable **Email/Password**.
3. Navigate to **Firestore Database** &rarr; **Create database** &rarr; Choose production mode and select your region.
4. In **Project Settings** &rarr; **General** &rarr; Scroll down to **Your apps** &rarr; Click the Web icon `</>` &rarr; Register the app to get your Web API credentials (`apiKey`, `authDomain`, `projectId`, `appId`).
5. In **Project Settings** &rarr; **Service accounts** &rarr; Click **Generate new private key**. Download the JSON file.

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:

**macOS / Linux:**
```bash
cp .env.example .env
```

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in your Firebase values:
```env
PORT=3000
NODE_ENV=development

# Option A: Path to downloaded Service Account JSON
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# OR Option B: Inline credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Web Client Configuration
FIREBASE_WEB_API_KEY=AIzaSy...
FIREBASE_WEB_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_WEB_PROJECT_ID=your-project-id
FIREBASE_WEB_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_WEB_MESSAGING_SENDER_ID=123456789
FIREBASE_WEB_APP_ID=1:123456789:web:abcdef

# Session Secrets
SESSION_SECRET=super-secret-random-key-at-least-32-chars
CSRF_SECRET=csrf-secret-random-key-at-least-32-chars
```

### Step 5: Bootstrap the Administrator
Create your primary root administrator account:

**macOS / Linux:**
```bash
node scripts/bootstrap-admin.js "admin@blindspot.local" "AdminPassword123!" "Chief Logistics Director"
```

**Windows PowerShell:**
```powershell
node scripts/bootstrap-admin.js admin@blindspot.local AdminPassword123! "Chief Logistics Director"
```

### Step 6: Seed SLA Policies and Demonstration Orders
Seed default SLA durations and realistic multi-stage packages:
```bash
node scripts/seed-stage-policies.js --demo
```

### Step 7: Start the Blindspot Server
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🧪 Testing

Run the automated test suite with the built-in Node.js runner:
```bash
npm test
```

### Test Coverage Areas:
- **`tests/delays.test.js`**: SLA threshold comparisons, overdue minutes, warning zones, and completed late distinctions.
- **`tests/permissions.test.js`**: Role-based access control (`CONFIRM`, `PACK`, `DOC`, `DEL`, `ADMIN`), denying cross-station operations.
- **`tests/workflow.test.js`**: Enforcing sequential stage advancement (`CONFIRM` &rarr; `PACK` &rarr; `DOC` &rarr; `DEL`) without skipping.
- **`tests/reports.test.js`**: Date ranges, pagination offsets, and CSV formula injection sanitization.
- **`tests/auth.test.js`**: ID token validation, password strength criteria, and role enum validation.

---

## 🔒 Security Best Practices

- **Strict Content Security Policy (CSP):** Helmet configured with whitelisted origins for Google/Firebase endpoints.
- **Session Protection:** HTTP-only, `SameSite=Strict`, `Secure` in production.
- **Principle of Least Privilege:** Fine-grained role matrix prevents operators from tampering with unassigned stages.
- **CSV Formula Injection Sanitization:** Every exported value is sanitized against leading `=, +, -, @` trigger characters.
- **Tamper-Proof Audit History:** Sub-collections record immutable historical snapshots of who advanced each consignment, with millisecond-accurate timestamps.

---

## 📄 License
UNLICENSED &bull; Proprietary Supply Chain Software.
