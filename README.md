# Farm2Home

A MERN-stack marketplace connecting local farmers with customers. Supports customers, farmers, delivery agents, and admins.

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1 — Server

```bash
cd server
cp .env.example .env      # fill in your values
npm install
npm run seed              # optional: seed sample data
npm run dev               # runs on http://localhost:5000
```

### 2 — Client

```bash
cd client
cp .env.example .env      # already set for local dev
npm install
npm run dev               # runs on http://localhost:3000
```

---

## Environment Variables

### `server/.env`

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | local |
| `JWT_SECRET` | Min 32-char random string | — |
| `JWT_EXPIRY` | Token lifetime | `7d` |
| `ADMIN_EMAIL` | Default admin login | — |
| `ADMIN_PASSWORD` | Default admin password | — |
| `CORS_ORIGIN` | Client URL | `http://localhost:3000` |
| `RATE_LIMIT_MAX` | API requests per 15 min | `1000` |
| `AUTH_RATE_LIMIT_MAX` | Auth requests per 15 min | `30` |
| `SMTP_*` | Email (optional — OTP shown in console in dev) | — |

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Server URL (`http://localhost:5000`) |

---

## Project Structure

```
farm2home/
├── client/                  React + Vite + Tailwind
│   └── src/
│       ├── modules/
│       │   ├── admin/       Admin dashboard + auth
│       │   ├── customer/    Product browsing, orders, checkout
│       │   ├── delivery/    Delivery agent dashboard
│       │   ├── farmer/      Farmer product management
│       │   └── payment/     Payment submission
│       └── shared/          Nav, Auth/Cart contexts, utils
└── server/                  Express + Mongoose
    ├── core/                Auth, middleware, shared models
    └── modules/             customer / farmer / delivery / admin / payment
```

---

## Roles & Access

| Role | Access |
|---|---|
| **Customer** | Browse products, place orders, track status |
| **Farmer** | Manage products, view orders, earnings |
| **Delivery** | View assigned deliveries, mark delivered |
| **Admin** | Full control — users, approvals, commissions, analytics |

Default admin: set `ADMIN_EMAIL` + `ADMIN_PASSWORD` in `.env`, then `npm run seed`.

---

## Key API Routes

| Method | Route | Auth |
|---|---|---|
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/customer/products` | Public |
| `POST` | `/api/customer/orders` | Optional |
| `GET` | `/api/farmer/products` | Farmer |
| `GET` | `/api/delivery/deliveries` | Delivery |
| `GET` | `/api/admin/dashboard` | Admin |
| `POST` | `/api/payment/submit` | Customer |

---

## Tech Stack

**Client:** React 18, React Router v7, Axios, Tailwind CSS, Vite  
**Server:** Express 4, Mongoose 8, JWT, bcryptjs, Multer 2, Helmet, compression
