# 💳 ExpenseApp - Full-Stack Modern Expense Tracking Application

A production-ready, modern, attractive expense-tracking application built with **Next.js (App Router)**, **Expo (React Native)**, **Node.js Express REST API**, and **Supabase (PostgreSQL, Auth & Storage)**.

---

## 🚀 Highlights & Core Features

1. **Family & Individual Expense Tracking**:
   - Record expenses for yourself or select any family member (e.g. Ramesh recording expenses for his brother Suresh).
   - Each transaction includes: Person/Member, Category, Amount (₹), Date, Notes, and optional Receipt photo.
   - Example categories included out of the box: **Petrol, Medical, Motor, Wire/Electrical, Food, Travel, Shopping, Education, Other**.
   - Custom category builder with custom icons and color pickers.

2. **Automated Real-Time Calculations**:
   - **Today's total expense**
   - **This month's total expense**
   - **Each family member's individual total spending** (e.g. Suresh's total: ₹1,540.00)
   - **Category-wise totals and percentage distribution**
   - **Selected date-range totals**

3. **Server-Side PDF Statement Reports & Sharing**:
   - Server-side PDF generation using `PDFKit` with professional headers, summary metric boxes, category breakdown tables, and itemized transaction tables.
   - Live PDF preview directly in the browser and mobile app.
   - One-click native mobile sharing via `expo-sharing` (WhatsApp, Email, or system share sheet).

4. **Modern UI/UX**:
   - Dark mode & Light mode support across both Web and Mobile.
   - Rounded cards with soft shadows, gradient primary buttons, and micro-interactions.
   - Mobile: Custom bottom navigation tabs (Dashboard, Expenses, Reports, Profile).
   - Web: Sidebar and topbar layout with user greeting and theme toggle.
   - Instant 1-click Demo mode showcasing Ramesh & his brother's expenses out of the box without requiring manual setup.

---

## 🏗 Tech Stack & Monorepo Structure

```
expense-app/
├── shared/                 # Shared TypeScript interfaces, types, constants & Zod schemas
│   ├── src/types.ts
│   ├── src/schemas.ts
│   ├── src/constants.ts
│   └── src/utils.ts
├── server/                 # Node.js + Express REST API
│   ├── src/config/         # Supabase & Environment configuration
│   ├── src/middlewares/    # Auth, centralized Error Handler, Zod validation
│   ├── src/routes/         # Auth, Profile, Family, Categories, Expenses, Reports
│   ├── src/services/       # PDFKit generator, DataService (Supabase & Mock store)
│   └── src/test-api.ts     # Automated API verification test suite
├── web/                    # Next.js 14 App Router Web App
│   ├── src/app/            # App Router pages (/dashboard, /expenses, /members, /categories, /reports, /profile)
│   ├── src/components/ui/  # Modern Card, Button, Modal, Badge components
│   └── src/lib/            # API client, AuthProvider, ThemeProvider
├── mobile/                 # Expo React Native App (Expo Router)
│   ├── app/                # File-based routing (_layout, splash, (auth), (tabs))
│   ├── src/api/            # Mobile API Client
│   ├── src/context/        # AuthContext, ThemeContext
│   ├── app.json            # Expo configuration (permissions, Android package)
│   └── eas.json            # Expo EAS Build profiles for Android APK
├── supabase/
│   ├── migrations/         # PostgreSQL DDL, Row Level Security (RLS) & Triggers
│   └── seed.sql            # Ramesh & Brother Suresh seed data
└── .env.example            # Environment variables template
```

---

## 🗄️ Database Design & Supabase Setup

### Database Tables:
- **`profiles`**: `id` (references `auth.users`), `full_name`, `phone`, `avatar_url`, `role`, `created_at`
- **`family_groups`**: `id`, `name`, `owner_id` (references `profiles`), `created_at`
- **`family_members`**: `id`, `family_group_id`, `user_id` (nullable), `display_name`, `created_at`
- **`categories`**: `id`, `user_id` (nullable for defaults), `name`, `icon`, `color`, `is_default`, `created_at`
- **`expenses`**: `id`, `user_id`, `family_group_id`, `member_id`, `category_id`, `amount`, `expense_date`, `note`, `receipt_url`, `created_at`

### Row Level Security (RLS) Policies:
- **`profiles`**: Users can view and update only their own profile.
- **`family_groups`**: Users can view groups where they are the owner or a linked member.
- **`family_members`**: Group owners and members can access their group's members.
- **`categories`**: Users can view default categories and their own custom categories.
- **`expenses`**: Users can view and manage only expenses belonging to their family group.
- **`storage.buckets`**: `avatars` and `receipts` buckets with user-isolated upload permissions.

### Automatic Triggers:
- A PostgreSQL trigger `on_auth_user_created` automatically creates the user's `profile`, default `family_group`, and adds the user as the primary `family_member` upon signup.

### Applying Migrations:
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New query**.
3. Copy and run [`supabase/migrations/20261014_init_schema.sql`](supabase/migrations/20261014_init_schema.sql).
4. (Optional) Run [`supabase/seed.sql`](supabase/seed.sql) to populate Ramesh's demo expenses.

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root (or copy from `.env.example`):

```bash
cp .env.example .env
```

Set the following variables:
```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

# Supabase (Get from Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database URI (Project Settings -> Database)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# API URLs
NEXT_PUBLIC_API_URL=/api
API_BASE_URL=http://localhost:5000/api
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

> **Authentication Architecture**:
> - **Production Mode (Supabase)**: Access tokens are issued and cryptographically signed by Supabase Auth. The Express backend verifies them directly via Supabase Auth (`supabase.auth.getUser(token)`). **No local `JWT_SECRET` is required** for production, and Supabase project signing keys are never manually handled or rotated by Express.
> - **Offline Demo Mode**: If Supabase variables are left empty, the application automatically runs in Demo Mode with an in-memory store. In this mode alone, Express self-signs mock tokens using an internal server secret (`JWT_SECRET`) for offline local testing.

---

## 🏃 Local Development Setup

### 1. Install Dependencies & Build Shared Package
```bash
# Build shared library
npm install --prefix shared
npm run build --prefix shared

# Install server dependencies
npm install --prefix server

# Install web dependencies
npm install --prefix web

# Install mobile dependencies
npm install --prefix mobile
```

### 2. Run the Express Backend Server
```bash
npm --workspace=server run dev
# Server starts on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 3. Run the Next.js Web Frontend
```bash
npm --workspace=web run dev
# Web app starts on http://localhost:3000
```
Open `http://localhost:3000` in your browser. You can click **"Try Live Demo as Ramesh"** or create a new account!

### 4. Run the Expo Mobile App
```bash
npm --workspace=mobile run start
```
- Press `a` to open in Android Emulator.
- Press `i` to open in iOS Simulator.
- Press `w` to open in Web browser.
- Or scan the QR code using the **Expo Go** app on your physical mobile phone.

---

## 🧪 Automated Testing

A complete test suite is included in `server/src/test-api.ts`. It verifies:
- Health check
- User Authentication & JWT generation
- Profile & Family group fetching
- Category listing
- **Ramesh's brother (Suresh) expense calculation: Petrol ₹1200 + Medical ₹130 + Motor ₹90 + Wire ₹120 = ₹1540 (100% verified!)**
- Server-side PDF Statement generation and streaming

To run the test:
```bash
npx --prefix server tsx src/test-api.ts
```

---

## 🌐 Web Deployment on Vercel

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), select your repo.
3. Configure the Project:
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
4. Set Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `NEXT_PUBLIC_API_URL`: Your deployed backend API URL (e.g., `https://api.yourdomain.com/api`)
5. Click **Deploy**.

---

## 📱 Mobile Android APK Build via Expo EAS

To generate a standalone `.apk` for Android devices:

### 1. Install EAS CLI and Log In
```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS Project
```bash
cd mobile
eas init
```

### 3. Build Android APK
Run the preview build profile (configured in `mobile/eas.json` to output a `.apk` file):
```bash
eas build --platform android --profile preview
```
When the build completes, EAS provides a direct download link for the `.apk` file that can be installed on any Android phone.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user (name, email, phone, password, avatar) |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `POST` | `/api/auth/logout` | Sign out active session |
| `GET` | `/api/profile` | Get current user profile and family group |
| `PATCH` | `/api/profile` | Update profile full name and phone number |
| `POST` | `/api/profile/avatar` | Upload profile photo to Supabase Storage |
| `GET` | `/api/family/members` | Get family members in current family group |
| `POST` | `/api/family/members` | Add a new family member (e.g. Brother) |
| `GET` | `/api/categories` | Get default and custom categories |
| `POST` | `/api/categories` | Create custom category (name, icon, color) |
| `GET` | `/api/expenses` | Get expenses with filters (`from`, `to`, `memberId`, `categoryId`, `search`) |
| `POST` | `/api/expenses` | Record new expense entry |
| `POST` | `/api/expenses/upload-receipt` | Upload receipt image to Supabase Storage |
| `PATCH` | `/api/expenses/:id` | Update expense details |
| `DELETE` | `/api/expenses/:id` | Delete an expense entry |
| `GET` | `/api/reports/summary` | Get financial calculations (Total, Today, Month, Member totals, Category breakdown) |
| `POST` | `/api/reports/pdf` | Generate server-side PDF expense statement |
| `GET` | `/api/reports/pdf/:reportId` | Download / Stream PDF report |

---

## 👨‍💻 Example Use Case: Ramesh & His Brother

1. Ramesh logs into **ExpenseApp**.
2. Under **Expenses**, Ramesh records 4 entries selecting his brother Suresh:
   - **Petrol**: ₹1,200.00
   - **Medical**: ₹130.00
   - **Motor**: ₹90.00
   - **Wire/Electrical**: ₹120.00
3. The dashboard and member summary automatically display Suresh's total as **₹1,540.00**.
4. Ramesh clicks **"Generate PDF Report"** on the Reports screen.
5. The PDF statement is rendered with an itemized transaction ledger, category breakdown pie/bar, and total amount.
6. Ramesh clicks **"Share to WhatsApp"** to send the statement directly to his brother!

