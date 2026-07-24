# MEDWEB — Firebase & Cloudinary Setup Guide

## Step 1 — Install Dependencies
```bash
npm install
```

## Step 2 — Firebase Setup

### 2a. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `medweb-pk`
3. Enable **Google Analytics** (optional)

### 2b. Enable Firestore
1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select your preferred region

### 2c. Enable Authentication
1. Firebase Console → **Authentication** → **Get started**
2. Click **Email/Password** → Enable it → Save
3. Go to **Users** tab → **Add user**
4. Create: `admin@medweb.pk` / your-secure-password

### 2d. Get your Firebase Config
1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to **Your apps** → Click **Web** (`</>`)
3. Register app as `medweb-web`
4. Copy the `firebaseConfig` object

### 2e. Paste Config into the project
Open `src/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",         // ← paste from Firebase
  authDomain:        "medweb-pk.firebaseapp.com",
  projectId:         "medweb-pk",
  storageBucket:     "medweb-pk.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
}
```

### 2f. Firestore Security Rules (for production)
In Firebase Console → Firestore → **Rules**, replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read for website sections
    match /webinars/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /courses/{doc}  { allow read: if true; allow write: if request.auth != null; }
    match /blogPosts/{doc}{ allow read: if true; allow write: if request.auth != null; }
    match /ambassadors/{doc}{ allow read: if true; allow write: if request.auth != null; }
    match /team/{doc}     { allow read: if true; allow write: if request.auth != null; }
    // Admin only
    match /students/{doc}      { allow read, write: if request.auth != null; }
    match /certificates/{doc}  { allow read, write: if request.auth != null; }
  }
}
```

---

## Step 3 — Cloudinary Setup

Your Cloudinary details are already configured in `src/firebase/cloudinary.js`:
- **Cloud name**: `dxsrucrpg`
- **Upload preset**: `medweb` (unsigned)

### Verify your preset is unsigned:
1. Go to https://cloudinary.com → **Settings** → **Upload**
2. Find the `medweb` preset → ensure **Signing Mode** = **Unsigned**

Images uploaded from the admin panel are stored in:
- `medweb/courses/` — course thumbnails
- `medweb/team/` — team member photos
- `medweb/ambassadors/` — ambassador profile photos
- `medweb/blog/` — blog cover images

The **Cloudinary secure URL** is saved to Firestore and displayed on the frontend automatically.

---

## Step 4 — Run the project
```bash
npm run dev
```

Open http://localhost:5173

- **Website**: http://localhost:5173/
- **Admin Login**: http://localhost:5173/admin/login
- **Admin Panel**: http://localhost:5173/admin

---

## Data Flow Summary

```
Admin adds a team member with photo
        ↓
Photo uploaded → Cloudinary (medweb/team/)
        ↓
Cloudinary returns secure_url
        ↓
secure_url + form data → Firestore (team collection)
        ↓
Frontend (About section) reads from Firestore
        ↓
Displays photo from Cloudinary CDN URL
```

## Collections in Firestore

| Collection    | Used by                          |
|---------------|----------------------------------|
| `students`    | Admin Students page              |
| `webinars`    | Admin Webinars + Website slider  |
| `courses`     | Admin Courses + Website cards    |
| `certificates`| Admin Certs + Website verifier   |
| `ambassadors` | Admin Ambassadors + Website list |
| `blogPosts`   | Admin Blog + Website articles    |
| `team`        | Admin Team + Website slider      |
