# Security Policy & Hardening Guide

## 1. Security Overview

**Pocket Console OS** implements multi-layered security across client-side logic, Google Firebase Cloud Firestore, Realtime Database (RTDB), and Authentication to protect user data, prevent unauthorized modifications, and eliminate anti-cheat vulnerabilities.

---

## 2. Security Layers Implemented

### A. Cloud Firestore Rules (`Data/Index/firestore.rules`)
- **Strict User Ownership**: Users can only write and update documents in their own `/users/{uid}` path.
- **Anti-Cheat Bounds**: Score submissions (`galaxyScore`, `snakeScore`, `typewriterWpm`, `carScore`, `kennyScore`) are mathematically validated against realistic maximum boundaries to block memory injection or modified scripts.
- **Community Ratings Schema**: Documents in `/game_ratings/{ratingId}` enforce:
  - User authentication requirement (`request.auth != null`).
  - Strict ownership (`request.resource.data.userId == request.auth.uid`).
  - Integer star bounds between 1 and 5.
  - Review text size limit (maximum 500 characters).
- **Wishlist Isolation**: User wishlists `/users/{uid}/wishlist/{gameId}` are completely private and only readable/writable by the authenticated owner.
- **Chat & Room Security**: Messages and XO game rooms require mutual friendship confirmation and validate 2-member array structures.

### B. Realtime Database Rules (`Data/Index/database.rules.json`)
- **Live Leaderboard Validation**: WPM and accuracy on `/typewriterLeaderboard/{uid}` and snake scores on `/snakeLeaderboard/{uid}` enforce schema types, non-negative numbers, and maximum ceilings.
- **Live Presence Security**: Status paths `/status/{uid}` restrict writes exclusively to the authenticated user and validate allowed states (`online` / `offline`).

### C. Client-Side XSS & Input Sanitization
- **HTML Sanitization**: All user-generated strings (e.g. `displayName`, `publicId`, `text`) are sanitized through `escapeHtml()` before rendering into the DOM to prevent Cross-Site Scripting (XSS).
- **URL Whitelisting**: External avatar URLs and assets are checked against valid protocol whitelists via `sanitizeUrl()`.
- **API Rate Limiting**: Cooldown debounces on user ratings (1.5s) and wishlist additions (1.2s) to prevent spamming cloud endpoints.

### D. HTTP Security Headers (`firebase.json`)
- `X-Content-Type-Options: nosniff` (Prevents MIME-type sniffing).
- `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking attacks).
- `Referrer-Policy: strict-origin-when-cross-origin` (Protects user privacy across origins).
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (Disables unnecessary device hardware access).

---

## 3. How to Deploy Security Rules (For Project Admins)

When deploying to Firebase Hosting and applying the security rules:

```bash
# 1. Login to Firebase CLI
firebase login

# 2. Select the Pocket Console project
firebase use pocketconsole-cde70

# 3. Deploy Firestore and Realtime Database rules
firebase deploy --only firestore:rules,database

# 4. (Optional) Deploy full site with security headers
firebase deploy
```

---

## 4. Reporting a Vulnerability

If you discover a security vulnerability or exploit within Pocket Console:
1. Please do not open a public issue.
2. Contact the repository maintainers directly with a detailed description, reproduction steps, and proof-of-concept.
3. Maintainers will review and apply patches promptly.
