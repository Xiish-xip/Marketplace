# MarketPlace App — Firebase-First Architecture & Release Plan

Last reviewed: 2026-06-02

## Architecture Decision

**Firebase Spark (free tier)** for Auth, Firestore, and Hosting.
**Existing Express backend** for complex business logic (orders, payments, image uploads via Cloudinary).
**Flutter** for Android + iOS + macOS mobile apps.

| Layer | Technology | Status | Spark/Free? |
|-------|-----------|--------|-------------|
| **Auth** | Firebase Authentication (Email/Password + custom claims) | ✅ Live | ✅ Yes |
| **Database** | Firestore (users, products, orders, reviews, carts, sellers, categories, siteSettings, translations) | ✅ Rules + indexes deployed | ✅ Yes |
| **Backend API** | **Existing Express/Prisma backend** (`backend/`) — runs on Render/any Node.js host | ✅ Already built | ✅ Yes |
| **File Uploads** | **Cloudinary** (already configured in `.env`) — no Firebase Storage needed | ✅ Already integrated | ✅ Yes |
| **Web Frontend** | React/Vite web app — Firebase Hosting (`frontend/dist`) | ✅ Configured | ✅ Yes |
| **Mobile** | Flutter (Android + iOS + macOS) | 🔜 Building | ✅ Yes |
| **Realtime** | Socket.io (already in existing backend) | ✅ Already built | ✅ Yes |
| **Search** | Meilisearch (already in existing backend) | ✅ Already built | ✅ Yes |
| **Caching** | Redis (already in docker-compose) | ✅ Already built | ✅ Yes |

## Firebase Project

- **Project ID:** `marketplace-9d6f2`
- **Plan:** Spark (free) — no billing needed
- **Console:** https://console.firebase.google.com/project/marketplace-9d6f2/overview
- **Identity Platform:** https://console.cloud.google.com/customer-identity/project/marketplace-9d6f2

### ✅ What works on Spark (free, no upgrade needed):
- **Firebase Authentication** — Email/Password provider (enable in console)
- **Firestore** — Full read/write with security rules
- **Firebase Hosting** — Static hosting of `frontend/dist`
- **Firebase Analytics** — Basic analytics
- **Firebase Emulator Suite** — Full local development

### ❌ What requires Blaze (paid upgrade) — **We don't use**:
- Cloud Functions
- Firebase Storage
- Cloud Scheduler / PubSub
- Firebase Extensions requiring Compute

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Flutter / React App                        │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │Firebase   │  │Firestore SDK │  │ Express  │  │  Cloudinary │  │
│  │ Auth      │  │(direct read) │  │ API via  │  │  (images)   │  │
│  │(signin,   │  │products,     │  │ fetch/   │  │  via existing│  │
│  │ register) │  │carts, reviews│  │ axios    │  │  upload API │  │
│  └──────────┘  └──────────────┘  └──────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐
  │ Firebase │  │  Firestore   │  │  Express Backend          │
  │  Auth    │  │  (Spark)     │  │  (Orders, Payments,       │
  │          │  │              │  │   Admin, AI, Dropshipping,│
  └──────────┘  └──────────────┘  │   Cache, Search, Socket)  │
                                  │                           │
                                  │  Postgres + Redis +       │
                                  │  Meilisearch               │
                                  └───────────────────────────┘
```

## Firestore Collections

Already deployed with security rules. Used for **client-direct reads**:

| Collection | Access | Used For |
|-----------|--------|----------|
| `users` | Owner read/write, admin full | Profiles, roles |
| `products` | Public read, seller write | Product catalog |
| `categories` | Public read, admin write | Navigation |
| `orders` | Customer + seller read | Order tracking (read-only from Firestore) |
| `carts` | Owner read/write | Client-side cart |
| `reviews` | Public read, auth create | Product reviews |
| `sellers` | Public read, seller write | Seller profiles |
| `siteSettings` | Public read, admin write | Site config |
| `translations` | Public read, admin write | i18n |
| `pages` | Public read, admin write | CMS pages |
| `chats` | Participant read/write | Messaging |
| `notifications` | Owner read/write | User notifications |

## Migration Path from Express-only to Firebase + Express

1. ✅ **Auth** → Firebase Auth for login/register + Express JWT for API authentication (dual auth)
2. ✅ **Products** → Read from Firestore directly, writes via Express API
3. ✅ **Carts** → Firestore client-side for instant UI updates
4. ✅ **Reviews** → Firestore client-side
5. ✅ **Categories** → Firestore client-side
6. 🔄 **Orders** → Express API (complex), Firestore read-only
7. 🔄 **Admin Dashboard** → Express API (counts, aggregations)
8. 🔄 **File Uploads** → Cloudinary (already configured)
9. 🔄 **Search** → Meilisearch (already configured)
10. 🔄 **Chat/Notifications** → Socket.io (already configured)

## How Firebase Auth Integrates with Express

The Flutter app signs in via Firebase Auth, then sends the Firebase ID token to the Express backend. The backend verifies the JWT using `firebase-admin` SDK and maps it to the existing user system. This way:
- Firebase handles auth UI and token management on mobile
- Express handles all business logic
- No Firebase Cloud Functions needed

## Updated Directory Structure

```
MarketPlace/
  .firebaserc                  # Firebase project alias
  firebase.json                # Firebase config (hosting, firestore, emulators)
  firestore.rules              # Security rules 🚀 deployed
  firestore.indexes.json       # Composite indexes 🚀 deployed
  functions/                   # (Source kept for reference, deploy needs Blaze)
    src/index.ts               # 23 callable functions
  frontend/                    # React/Vite web app
    dist/                      # Build output
    src/                       # Source
    flutter/                   # Flutter mobile app (to be created)
  backend/                     # Existing Express backend — primary API
    src/
    prisma/
  docs/
    APP_RELEASE_AND_FIREBASE_PLAN.md
  graphify-out/
```

## Firebase Setup Checklist

### ✅ Done
- [x] Firebase project `marketplace-9d6f2` created
- [x] Firestore rules deployed (`firestore.rules`)
- [x] Firestore indexes deployed (`firestore.indexes.json`)
- [x] Firebase config files ready (`.firebaserc`, `firebase.json`)

### 🔲 User Action Needed
- [ ] **Enable Authentication**: Go to [Firebase Console → Authentication](https://console.firebase.google.com/project/marketplace-9d6f2/authentication) → Sign-in method → Enable **Email/Password**
- [ ] No Storage/Functions needed — saves $0

## Store Release Checklist

### Preflight
- [x] Frontend `npm run build` passes
- [x] Backend `npm run build` passes
- [ ] Backend tests pass
- [x] Firebase project created (marketplace-9d6f2)
- [x] Firestore rules + indexes deployed
- [ ] Firebase Authentication (Email/Password) enabled (console action)

### Android (Flutter)
- [ ] `flutterfire configure` — connects Flutter to Firebase
- [ ] Flutter app builds for Android
- [ ] Signed APK/AAB for Play Store
- [ ] Store listing complete

### iOS (Flutter)
- [ ] `flutterfire configure` — iOS config
- [ ] Xcode signing configured
- [ ] TestFlight build uploaded
- [ ] App Store listing complete

### macOS (Phase 2)
- [ ] Flutter macOS builds

### Required App Store Assets
- [ ] App name, tagline, description
- [ ] Privacy policy URL
- [ ] Support email
- [ ] App icon
- [ ] Screenshots (phone + tablet)
- [ ] Demo/test account credentials
- [ ] Feature list

## After Each Code Change

```bash
graphify update .