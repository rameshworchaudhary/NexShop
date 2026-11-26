#NexShop - Nepal's modern e-commerce platform.

A complete, production-ready Nepal-focused e-commerce platform built with Next.js 16, TypeScript, Firebase, and integrated eSewa/Khalti payments.

---

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS + ShadCN UI components
- **Backend:** Firebase (Auth, Firestore, Storage)
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Payments:** eSewa v2, Khalti Web Checkout v2, Cash on Delivery

---

## 🚀 STEP 1 — Required Software Installation

Install the following on your Windows machine before starting:

1. **Node.js v18 or higher (v20 LTS recommended)**
   Download: https://nodejs.org/en/download
   Verify install:
   ```bash
   node --version
   npm --version
   ```

2. **VS Code** — https://code.visualstudio.com/

3. **Git** — https://git-scm.com/download/win

4. Recommended VS Code Extensions:
   - ESLint
   - Tailwind CSS IntelliSense
   - Prettier

---

## 📂 STEP 2 — Open the Project

1. Extract the `MeroPasal` folder anywhere on your machine (e.g. `C:\Projects\MeroPasal`)
2. Open VS Code → File → Open Folder → select `MeroPasal`
3. Open the integrated terminal: `Ctrl + ~` (backtick)

---

## 🔥 STEP 3 — Create Your Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → Name it `MeroPasal` → Continue (disable Google Analytics if you don't need it) → Create Project

### Enable Authentication
- Build → Authentication → Get Started
- Sign-in method tab → Enable **Email/Password**
- Sign-in method tab → Enable **Google**

### Enable Firestore Database
- Build → Firestore Database → Create database
- Select **"Start in test mode"** for now (we'll deploy proper security rules later)
- Choose region: **asia-south1 (Mumbai)** — closest to Nepal

### Enable Storage
- Build → Storage → Get Started → Start in test mode → Same region as Firestore

### Register a Web App
- Project Settings (gear icon) → General tab → scroll to "Your apps" → click the Web icon `</>`
- Register app name: `MeroPasal Web`
- Copy the `firebaseConfig` object shown — you'll need these values in Step 4

### Generate Admin SDK Credentials
- Project Settings → Service Accounts tab
- Click **"Generate new private key"** → confirms a JSON file download
- Open that JSON file — you'll need `project_id`, `client_email`, and `private_key` from it in Step 4

---

## 🔑 STEP 4 — Create Your `.env.local` File

In the project root, copy `.env.example` to `.env.local`:

**Windows (Command Prompt):**
```bash
copy .env.example .env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in VS Code and fill in your Firebase values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=meropasal-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=meropasal-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=meropasal-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

FIREBASE_ADMIN_PROJECT_ID=meropasal-xxxxx
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@meropasal-xxxxx.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKc...\n-----END PRIVATE KEY-----\n"

NEXT_PUBLIC_APP_URL=http://localhost:3000

ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
NEXT_PUBLIC_ESEWA_GATEWAY_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
ESEWA_STATUS_CHECK_URL=https://rc.esewa.com.np/api/epay/transaction/status/

NEXT_PUBLIC_KHALTI_PUBLIC_KEY=test_public_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KHALTI_SECRET_KEY=test_secret_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KHALTI_GATEWAY_URL=https://a.khalti.com/api/v2
```

> ⚠️ **Important:** The `FIREBASE_ADMIN_PRIVATE_KEY` must keep its `\n` characters and be wrapped in quotes exactly as shown — copy it directly from the downloaded JSON file's `private_key` field.

---

## 📦 STEP 5 — Install Dependencies

All dependencies are listed in `package.json`. Install everything with one command:

```bash
npm install --legacy-peer-deps
```

This installs (among others):
```bash
npm install next react react-dom firebase firebase-admin
npm install zustand react-hook-form @hookform/resolvers zod
npm install framer-motion recharts lucide-react
npm install clsx tailwind-merge class-variance-authority tailwindcss-animate
npm install sonner date-fns embla-carousel-react
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-label @radix-ui/react-select @radix-ui/react-tabs
npm install @radix-ui/react-toast @radix-ui/react-checkbox @radix-ui/react-switch
npm install @radix-ui/react-avatar @radix-ui/react-separator @radix-ui/react-accordion
npm install @radix-ui/react-radio-group @radix-ui/react-progress @radix-ui/react-popover
npm install @radix-ui/react-tooltip @radix-ui/react-slider @radix-ui/react-scroll-area
npm install @radix-ui/react-alert-dialog

npm install -D typescript @types/node @types/react @types/react-dom
npm install -D tailwindcss postcss autoprefixer eslint eslint-config-next
npm install -D tsx dotenv
```

---

## ▶️ STEP 6 — Run the Project

```bash
npm run dev
```

Open your browser to **http://localhost:3000** — you should see the MeroPasal homepage.

### Seed Initial Data (Recommended)

Populate Firestore with starter categories, shipping zones, and a welcome coupon:

```bash
npm run seed
```

### Create Your First Admin User

1. Go to `http://localhost:3000/register` and create an account
2. Open **Firebase Console → Firestore Database → users collection**
3. Find your user document → change the `role` field from `"customer"` to `"admin"`
4. Log out and log back in on the site
5. Visit `http://localhost:3000/admin` — you now have full admin access

### Add Your First Products

From the admin panel: **Products → Add Product** — fill in details, upload images, assign to a category, and publish.

---

## 🐙 STEP 7 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial Commit - MeroPasal v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/meropasal.git
git push -u origin main
```

> `.gitignore` is already configured to exclude `node_modules`, `.env.local`, and build artifacts.

---

## ☁️ STEP 8 — Deploy to Vercel

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```
Follow the prompts, then add environment variables when asked (or via dashboard, see below).

### Option B: Vercel Dashboard (Recommended)
1. Go to **https://vercel.com** → New Project → Import your GitHub repo
2. Framework Preset: **Next.js** (auto-detected)
3. Before deploying, go to **Settings → Environment Variables** and add every variable from your `.env.local` file
4. Click **Deploy**
5. Once deployed, update `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://meropasal.vercel.app`) and redeploy

### Deploy Firestore & Storage Rules

Install Firebase CLI and deploy the security rules included in this project:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore storage
# Select your existing MeroPasal project, accept default file names
# (firestore.rules and storage.rules are already provided in this project)
firebase deploy --only firestore:rules,storage:rules
```

---

## 💳 STEP 9 — eSewa Live Setup

The project ships configured for **eSewa Sandbox/Test mode** out of the box:
- Test Merchant Code: `EPAYTEST`
- Test Secret Key: `8gBm/:&EnhH.1/q`
- Test eSewa ID: `9806800001` / `9806800002` | Password: `Nepal@123` | MPIN: `1122` | Token (OTP): `123456`

### Going Live
1. Register as a merchant at **https://merchant.esewa.com.np**
2. Submit required business documents (PAN/VAT, citizenship, bank details)
3. Once approved, eSewa will issue your **live Merchant Code** and **Secret Key**
4. Update `.env.local` (and your Vercel environment variables):
   ```env
   ESEWA_MERCHANT_CODE=YOUR_LIVE_MERCHANT_CODE
   ESEWA_SECRET_KEY=YOUR_LIVE_SECRET_KEY
   NEXT_PUBLIC_ESEWA_GATEWAY_URL=https://epay.esewa.com.np/api/epay/main/v2/form
   ESEWA_STATUS_CHECK_URL=https://esewa.com.np/api/epay/transaction/status/
   ```

---

## 💳 STEP 10 — Khalti Live Setup

The project ships configured for **Khalti Sandbox/Test mode**:
- Test eSewa-equivalent number: `9800000000` / `9800000001` through `9800000005`
- Test MPIN: `1111` | Test OTP: `987654`

### Going Live
1. Register a merchant account at **https://khalti.com/business/**
2. Complete KYC verification with required business documents
3. Once approved, retrieve your **live Public Key** and **Secret Key** from the Khalti merchant dashboard
4. Update `.env.local` (and Vercel environment variables):
   ```env
   NEXT_PUBLIC_KHALTI_PUBLIC_KEY=live_public_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   KHALTI_SECRET_KEY=live_secret_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   KHALTI_GATEWAY_URL=https://khalti.com/api/v2
   ```

---

## 📁 Project Structure

```
MeroPasal/
├── src/
│   ├── app/
│   │   ├── (shop)/          # Customer-facing storefront pages
│   │   ├── (auth)/          # Login, Register, Forgot Password
│   │   ├── admin/           # Admin panel (protected)
│   │   └── api/payments/    # eSewa & Khalti API routes
│   ├── components/
│   │   ├── ui/               # ShadCN UI primitives
│   │   ├── layout/            # Navbar, Footer, CartDrawer
│   │   ├── home/               # Homepage sections
│   │   ├── product/             # Product cards, filters, detail view
│   │   ├── checkout/             # Address form, checkout flow
│   │   ├── orders/                # Order timeline
│   │   └── admin/                  # Admin dashboard, forms, tables
│   ├── lib/
│   │   ├── firebase/         # Firestore/Auth/Storage data layer
│   │   ├── payments/          # eSewa & Khalti integration logic
│   │   ├── types/               # TypeScript domain types
│   │   └── constants/            # Nepal geo data, site config
│   ├── store/                # Zustand stores (cart, auth, wishlist)
│   └── hooks/                 # Custom React hooks
├── scripts/seed.ts            # Database seeding script
├── firestore.rules            # Firestore security rules
├── storage.rules              # Storage security rules
├── middleware.ts               # Next.js middleware
└── .env.example                 # Environment variable template
```

---

## ✅ Features Included

**Customer:** Homepage, Categories, Product Listing & Filters, Search, Product Detail with Reviews, Cart, Wishlist, Multi-step Checkout, Order Tracking, Order History, Profile & Address Management

**AI-style Recommendations:** Similar Products, Trending Products, New Arrivals, Recently Viewed (tracked per user)

**Admin Panel:** Dashboard with Revenue/Sales Charts, Product CRUD, Category Management, Order Management with Status Timeline, Customer Management, Coupon Management, Banner Management, Shipping Zone Management (district-based), Analytics with Top Products

**Nepal-Specific:** Full Province → District → Municipality → Ward cascading address selector (all 77 districts), NPR currency formatting, Nepali phone validation

**Security:** Firestore & Storage security rules, role-based admin access, environment-variable-only secrets, input validation via Zod on every form

---

## 🆘 Troubleshooting

- **"Missing Firebase Admin credentials" error:** Double-check `.env.local` has all three `FIREBASE_ADMIN_*` values, and that the private key retains its `\n` line breaks.
- **Images not uploading:** Confirm Firebase Storage is enabled and your Storage security rules have been deployed.
- **Payment redirect fails locally:** eSewa/Khalti sandbox callbacks require a publicly reachable URL in production; for local testing, COD works without external callbacks.
- **Admin panel redirects to home:** Make sure your user's Firestore document has `role: "admin"` (not `"Admin"` or `"ADMIN"` — case sensitive).

---

Built with ❤️ for Nepal 🇳🇵
