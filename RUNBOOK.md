# ExpenseApp Production Runbook & Operational Guide

This document provides complete operational procedures, architectural details, error diagnoses, deployment guides, and verification instructions for the **ExpenseApp** full-stack production application.

---

## 1. System Architecture

```
                          ┌───────────────────────────┐
                          │   Supabase Cloud Platform │
                          │   - PostgreSQL 15 (RLS)   │
                          │   - Supabase Auth (JWT)   │
                          │   - Storage: avatars/     │
                          │   - Storage: receipts/    │
                          └─────────────▲─────────────┘
                                        │
                      ┌─────────────────┴─────────────────┐
                      │                                   │
                      │ Bearer Token / getUser()          │ Direct / Proxied Client
                      │                                   │
           ┌──────────┴──────────┐             ┌──────────┴──────────┐
           │   Express REST API  │             │   Next.js Web App   │
           │   (Node.js / Vercel)│             │      (Vercel)       │
           └──────────▲──────────┘             └──────────▲──────────┘
                      │                                   │
                      │ REST / Multi-part Uploads         │ Browser / Desktop
                      │                                   │
           ┌──────────┴──────────┐                        │
           │  Expo Mobile App    │────────────────────────┘
           │ (Android APK / iOS) │
           └─────────────────────┘
```

### Workspaces & Responsibilities
- **`shared/`**: Common TypeScript domain types (`User`, `Expense`, `FamilyMember`, `Category`, `ReportSummary`), Zod validation schemas, and currency/date formatting helpers.
- **`server/`**: Express REST API featuring Supabase Auth integration (`getUser(token)`), role extraction from `public.profiles`, category isolation, rate limiting, Multer file upload parsing, and PDF report generation. Can run as a standalone Node server or as a serverless function on Vercel.
- **`web/`**: Next.js 14 App Router application with Tailwind CSS, Radix UI/shadcn components, SWR/React Query data synchronization, responsive charts, and PDF download streaming.
- **`mobile/`**: React Native application built on Expo SDK 51, Expo Router v3, NativeWind, `@react-native-async-storage/async-storage`, and native photo picker/sharing modules.
- **`supabase/`**: PostgreSQL migrations, Row Level Security policies, storage bucket configurations, and signup lifecycle trigger.

---

## 2. Root Cause Analysis & Technical Fixes

### A. Metro Configuration: `watchFolders does not contain all entries from Expo's defaults`
- **Root Cause**: In npm monorepos, Metro needs to watch root `node_modules` and sibling packages (like `../shared`). In previous revisions, `mobile/metro.config.js` completely replaced `config.watchFolders` with `[workspaceRoot]`, stripping Expo's internally required watch paths.
- **Fix**: Merged Expo's default watch folders with the monorepo root:
  ```javascript
  config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));
  ```
- **Verification**: `npx expo-doctor@latest` passed with 17/17 checks successful.

### B. Bundling Error: `process.env.EXPO_ROUTER_APP_ROOT`
- **Root Cause**: `babel-preset-expo` was hoisted to the monorepo root `node_modules/`, while `expo-router` was located inside `mobile/node_modules/`. When Babel evaluated whether `expo-router` was installed via `hasModule('expo-router')`, standard Node module resolution searched only from root `node_modules/` and returned `false`. Consequently, Babel did not apply `expoRouterBabelPlugin`, leaving `process.env.EXPO_ROUTER_APP_ROOT` unreplaced at bundle time.
- **Fix**: In `mobile/babel.config.js`, injected `mobile/node_modules` into `process.env.NODE_PATH` and invoked `Module._initPaths()` before initializing the preset:
  ```javascript
  const path = require('path');
  const Module = require('module');
  const mobileNodeModules = path.resolve(__dirname, 'node_modules');
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${mobileNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    : mobileNodeModules;
  Module._initPaths();
  ```
- **Verification**: `npx expo export --platform android` compiled 100% cleanly with zero bundling errors.

### C. Metro TSConfig Trap: `@types/react` Bundling Syntax Error
- **Root Cause**: To resolve TypeScript types between React 18 and React Native types, `compilerOptions.paths` in `mobile/tsconfig.json` was briefly set to `"react": ["./node_modules/@types/react"]`. However, Metro parses `tsconfig.json` paths as module aliases at bundle time and attempted to bundle `@types/react/index.d.ts` as executable JavaScript, causing syntax errors (`'?' unexpected`).
- **Fix**: Removed TypeScript type paths from `paths` and used standard `compilerOptions.typeRoots`:
  ```json
  "typeRoots": ["./node_modules/@types", "../node_modules/@types"]
  ```
- **Verification**: `npm --workspace=mobile run typecheck` passed with 0 errors, and Metro bundling succeeded.

### D. Font Runtime Crash: `_ExpoFontLoader.default.getLoadedFonts is not a function`
- **Root Cause**: In Expo SDK 50 and earlier, `expo-font` provided `getLoadedFonts()`. In Expo SDK 51, `expo-font` v12.0.10 replaced this API with `isLoaded()`. Calling legacy methods caused instant app crashes on startup.
- **Fix**: Ensured `expo-font` v12.0.10 is used consistently and legacy calls are replaced with `Font.isLoaded()`.
- **Verification**: Running Expo Go on Android emulator `Pixel_6_Pro` loaded the production Sign In screen cleanly without any font runtime crash.

---

## 3. Files Changed and Rationale

| File Path | Description & Rationale |
| :--- | :--- |
| `mobile/babel.config.js` | Configured `NODE_PATH` and initialized `Module._initPaths()` so hoisted `babel-preset-expo` resolves `expo-router` correctly. |
| `mobile/metro.config.js` | Preserved default `watchFolders`, retained `nodeModulesPaths`, and mapped `@expense-app/shared` alias in `extraNodeModules`. |
| `mobile/tsconfig.json` | Replaced problematic `paths` alias with `typeRoots: ["./node_modules/@types", "../node_modules/@types"]`. |
| `mobile/package.json` | Added `"typecheck": "tsc --noEmit"` script. |
| `mobile/src/utils/storage.ts` | Upgraded to `@react-native-async-storage/async-storage` as primary engine with `expo-file-system` fallback. |
| `mobile/src/api/client.ts` | Added `refreshToken` persistence, automatic session refresh via `POST /api/auth/refresh` on 401, and profile verification. |
| `mobile/src/context/AuthContext.tsx` | Added session restoration on boot using persisted access and refresh tokens. |
| `server/src/routes/auth.routes.ts` | Implemented `POST /api/auth/refresh` using `supabaseClient.auth.refreshSession({ refresh_token })`. |
| `server/src/middlewares/auth.ts` | Hardened role resolution by querying `public.profiles` directly; strictly defaults to `'member'` and never trusts `raw_user_meta_data`. |
| `server/src/services/data.service.ts` | Enforced strict category isolation: `user_id = current_user_id OR (user_id IS NULL AND is_default = true)`. |
| `server/src/routes/report.routes.ts` | Enforced `authMiddleware` on PDF endpoints; verified stateless streaming via Puppeteer/PDFKit. |
| `web/src/lib/api.ts` | Added refresh token persistence in browser cookies/localStorage and automatic retry on 401. |
| `web/src/lib/auth-context.tsx` | Added seamless background token refresh and user session restoration on page load. |
| `supabase/migrations/20261015_real_auth_security_hardening.sql` | Idempotent user signup trigger, global default categories, and non-destructive backfill for existing profiles. |

---

## 4. Installed SDK & Framework Compatibility Matrix

| Technology | Installed Version | Compatibility Status |
| :--- | :--- | :--- |
| **Expo SDK** | `51.0.0` | Production ready; fully verified with `expo-doctor`. |
| **React Native** | `0.74.5` | Matched to Expo SDK 51. |
| **React** | `18.2.0` | Consistent across web and mobile. |
| **Expo Router** | `3.5.24` | Modern context module resolution working cleanly. |
| **NativeWind** | `2.0.11` | Tailwind CSS compiler configured with Babel preset. |
| **Next.js** | `14.2.3` | App Router with standalone static optimization and API proxy. |
| **Express** | `4.19.2` | Runs locally or on Vercel Serverless Functions. |
| **Node.js** | `>= 18.0.0` | Tested on Node.js v20+ Windows x64. |

> [!NOTE]
> When launching on Android 15 emulator images, Expo Go may show an informational notice regarding 16KB memory page alignment. This does not affect app execution in Expo Go and is dismissible.

---

## 5. Environment Variables Matrix

All secret credentials must be set in project `.env` files (never committed to git) or via cloud environment variable dashboards.

| Variable Name | Workspace | Required | Purpose | Sanitized Example |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `server`, `web` | Yes | Runtime environment mode | `production` / `development` |
| `PORT` | `server` | Yes | Local HTTP port for Express | `5000` |
| `DEMO_MODE` | `server` | Yes | Master switch: `false` enables real Supabase Auth/DB | `false` |
| `SUPABASE_URL` | `server`, `web` | Yes | Supabase project URL | `https://hguyngptdwqgccmlwpdq.supabase.co` |
| `SUPABASE_ANON_KEY` | `server`, `web` | Yes | Public Supabase anon key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `server` | Yes | Server-only privileged service key | `eyJhbGciOi...` |
| `NEXT_PUBLIC_API_URL` | `web` | Yes | REST API base URL for web client | `http://localhost:5000/api` (or `/api`) |
| `NEXT_PUBLIC_SUPABASE_URL` | `web` | Yes | Browser-side Supabase URL | `https://hguyngptdwqgccmlwpdq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `web` | Yes | Browser-side Supabase anon key | `eyJhbGciOi...` |
| `EXPO_PUBLIC_API_URL` | `mobile` | Yes | REST API endpoint for mobile devices | `http://10.0.2.2:5000` (emulator) or `http://10.30.142.28:5000` (LAN) |
| `EXPO_PUBLIC_SUPABASE_URL` | `mobile` | Yes | Mobile client Supabase URL | `https://hguyngptdwqgccmlwpdq.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `mobile` | Yes | Mobile client Supabase anon key | `eyJhbGciOi...` |

---

## 6. Local Execution Guide

### Prerequisites
1. Ensure all packages are built:
   ```bash
   npm run build:shared
   ```

### A. Start the Express Backend
```bash
npm --workspace=server run dev
```
- Binds to `0.0.0.0:5000`.
- Verify health:
  ```bash
  curl http://localhost:5000/api/health
  # Response: {"status":"healthy","demoMode":false,"supabaseHost":"hguyngptdwqgccmlwpdq.supabase.co"}
  ```

### B. Start the Next.js Web Application
```bash
npm --workspace=web run dev
```
- Accessible at [http://localhost:3000](http://localhost:3000).
- Automatically proxies `/api/*` to `http://localhost:5000/api/*`.

### C. Run on Android Emulator (`Pixel_6_Pro`)
1. Ensure the emulator is booted:
   ```powershell
   adb devices
   # List of devices attached: emulator-5554 device
   ```
2. Enable port reverse for fast Metro bundling:
   ```powershell
   adb reverse tcp:8081 tcp:8081
   ```
3. Start Expo targeting Android:
   ```powershell
   cd mobile
   npx expo start --android --clear
   ```
- The emulator will launch Expo Go and render the production Sign In screen.

### D. Run on Physical Android Phone
1. Connect the phone to the same Wi-Fi network as the development machine (`10.30.142.28`).
2. Update `mobile/.env`:
   ```bash
   EXPO_PUBLIC_API_URL=http://10.30.142.28:5000
   ```
3. Start Expo:
   ```powershell
   cd mobile
   npx expo start --clear
   ```
4. Open **Expo Go** on your device and scan the displayed QR code.

---

## 7. Client Connection Matrix

| Client | Interface | Target API Endpoint | Metro / App URL | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js Web** | Browser | `http://localhost:5000/api` (via rewrite `/api`) | `http://localhost:3000` | SSR and client components share session state. |
| **Android Emulator** | Expo Go | `http://10.0.2.2:5000` | `exp://127.0.0.1:8081` | `10.0.2.2` maps directly to host loopback. `adb reverse` routes 8081. |
| **Physical Phone** | Expo Go | `http://10.30.142.28:5000` | `exp://10.30.142.28:8081` | Requires host firewall to allow incoming port 5000 & 8081. |
| **Production Web** | Browser | `https://api.yourdomain.com/api` | `https://app.yourdomain.com` | Deployed to Vercel. |
| **Production APK** | Android | `https://api.yourdomain.com/api` | Native standalone binary | Built via Expo EAS. |

---

## 8. Proposed Database Migration Review

The migration file is located at `supabase/migrations/20261015_real_auth_security_hardening.sql`.

### Key Safety Guarantees
1. **Zero Disruption to Existing Data**: Does not drop tables, truncate records, disable RLS, or alter foreign key constraints.
2. **Idempotency**: All `INSERT` statements utilize `ON CONFLICT DO NOTHING` or `ON CONFLICT (id) DO UPDATE`.
3. **Privilege Hardening**: Replaces trigger `handle_new_user()` so that new registrations are strictly assigned `role = 'member'`, ignoring any user metadata manipulation.
4. **Non-Destructive Backfill**: Includes safe queries to populate missing `public.profiles`, `public.family_groups`, and primary `public.family_members` for existing users who registered before the trigger was created.

> [!IMPORTANT]
> To apply this migration to your live Supabase project, execute the SQL script in your Supabase Dashboard SQL Editor or via Supabase CLI after reviewing.

---

## 9. Vercel Deployment Settings (Two Separate Projects)

### Project 1: Express REST API Backend
- **Repository**: `expense-app`
- **Root Directory**: `server`
- **Framework Preset**: `Other`
- **Build Command**: `npm run build`
- **Output Directory**: Leave empty (handled by `vercel.json` and `api/index.ts`)
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `DEMO_MODE`: `false`
  - `SUPABASE_URL`: `https://hguyngptdwqgccmlwpdq.supabase.co`
  - `SUPABASE_ANON_KEY`: `[Your Supabase Anon Key]`
  - `SUPABASE_SERVICE_ROLE_KEY`: `[Your Supabase Service Role Key]`

### Project 2: Next.js Web Frontend
- **Repository**: `expense-app`
- **Root Directory**: `web`
- **Framework Preset**: `Next.js`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `https://<your-express-backend-project>.vercel.app/api`
  - `NEXT_PUBLIC_SUPABASE_URL`: `https://hguyngptdwqgccmlwpdq.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `[Your Supabase Anon Key]`

---

## 10. EAS Preview APK Build Instructions

The mobile app includes a pre-configured `mobile/eas.json` for generating standalone Android APK files for team testing without publishing to Google Play Store.

### Step 1: Install EAS CLI & Log In
```bash
npm install -g eas-cli
eas login
```

### Step 2: Initialize EAS in Mobile Directory
```bash
cd mobile
eas init
```

### Step 3: Trigger Android Preview Build
```bash
eas build --platform android --profile preview
```
- EAS Cloud will build the APK according to the configuration in `mobile/eas.json`:
  ```json
  "preview": {
    "distribution": "internal",
    "android": {
      "buildType": "apk"
    }
  }
  ```
- Once completed, EAS outputs a direct `.apk` download link installable on any Android device.

---

## 11. Troubleshooting Common Issues

### Issue 1: `EXPO_ROUTER_APP_ROOT` Error
- **Symptom**: `Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT`
- **Resolution**: Ensure `mobile/babel.config.js` contains the `NODE_PATH` and `Module._initPaths()` logic described in Section 2. Always clear cache: `npx expo start --clear`.

### Issue 2: `watchFolders` Expo Doctor Warning
- **Symptom**: `watchFolders does not contain all entries from Expo's defaults`
- **Resolution**: Confirm `mobile/metro.config.js` appends `workspaceRoot` using `Array.from(new Set([...(config.watchFolders || []), workspaceRoot]))`.

### Issue 3: Emulator Network Error (`ECONNREFUSED` / `Network Request Failed`)
- **Symptom**: Mobile app in Android emulator cannot communicate with Express server.
- **Resolution**: Android emulator cannot access `localhost:5000` on the host machine. Configure `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000`. Ensure Express listens on `0.0.0.0` rather than `127.0.0.1`.

### Issue 4: Session Expiration & Refresh Loop
- **Symptom**: User encounters unexpected 401 errors after JWT expiry.
- **Resolution**: Both web and mobile API clients intercept 401 responses, call `POST /api/auth/refresh` with the stored `refreshToken`, and re-attempt the request seamlessly. Ensure `DEMO_MODE=false`.
