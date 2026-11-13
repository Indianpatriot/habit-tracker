# HabitGraph - Habit Tracker with Streak Visualization (MERN)

> **Course**: Full Stack Application Development (MCA, RVCE)  
> **Repository**: [https://github.com/Indianpatriot/habit-tracker](https://github.com/Indianpatriot/habit-tracker)  
> **Stack**: MongoDB Atlas + Express + React 19 + Node.js 20 (MERN)

HabitGraph is a production-grade full-stack habit tracking application featuring GitHub-style streak heatmaps, gap-and-islands streak calculation with MongoDB aggregation window fields, computed achievement badges, and cross-habit correlation insights built strictly adhering to RVCE MCA course constraints.

---

## Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v20+
- **npm**: v9+
- A **MongoDB Atlas** cluster connection URI

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/Indianpatriot/habit-tracker.git
cd habit-tracker

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` in both `server/` and `client/`:

**Server Configuration (`server/.env`)**:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/habitgraph?retryWrites=true&w=majority
JWT_SECRET=supersecretphase2jwtkey12345678901234567890
CLIENT_ORIGIN=http://localhost:5173
```

**Client Configuration (`client/.env`)**:
```env
VITE_API_URL=http://localhost:5000
```

### 4. Seed the Database
Populate MongoDB Atlas with demo habits and ~90 days of realistic check-in logs:
```bash
cd server
npm run seed
```

**Demo Account Credentials**:
- **Email**: `demo@habit.com`
- **Password**: `demo1234`

### 5. Run the Application
From the repository root:
```bash
npm run dev
```
- **Client (Vite)**: [http://localhost:5173](http://localhost:5173)
- **Server (Express)**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## REST API Reference

All protected endpoints require an `Authorization: Bearer <token>` header obtained from `/api/auth/login` or `/api/auth/register`.

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user `{ name, email, password }` | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | Public | Authenticate user `{ email, password }` | `200`, `400`, `401` |
| `GET` | `/api/auth/me` | Protected | Get profile of logged-in user | `200`, `401` |

### 2. Habits CRUD (`/api/habits`)
| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/habits` | Protected | List user habits (supports `?q=` search), newest first | `200`, `401` |
| `POST` | `/api/habits` | Protected | Create habit `{ name, goalType, targetPerWeek, weekdays }` | `201`, `400`, `409` |
| `GET` | `/api/habits/:id` | Protected | Get single habit details by ID | `200`, `400`, `404` |
| `PUT` | `/api/habits/:id` | Protected | Update/rename habit | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/habits/:id` | Protected | Delete habit and cascade delete all its logs | `204`, `400`, `404` |

### 3. Check-ins & Idempotent Logs (`/api/habits/:id/logs`)
| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/habits/:id/logs` | Protected | Record completion (optional `{ date: "YYYY-MM-DD" }`, defaults to today UTC; idempotent upsert) | `200`, `400`, `404` |
| `DELETE` | `/api/habits/:id/logs/:date`| Protected | Remove completion for date (idempotent delete) | `200`, `400`, `404` |
| `GET` | `/api/habits/:id/logs?from=&to=` | Protected | List completion log date strings (`["YYYY-MM-DD", ...]`) | `200`, `400`, `404` |

### 4. Analytics & Aggregations (`/api/stats`)
Streaks, heatmaps, and stats are **never stored**; they are derived on-the-fly from logs using MongoDB aggregation pipelines.
| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/stats/heatmap?habitId=` | Protected | Exactly 90 items `[{ date, count }]` ending today UTC with 0 filled for missing days | `200`, `400`, `401` |
| `GET` | `/api/habits/:id/stats` | Protected | Habit streak stats `{ currentStreak, longestStreak, last30: { done, percent } }` via MongoDB window fields | `200`, `400`, `404` |
| `GET` | `/api/stats/activity` | Protected | Most and least active habits `{ most, least, message }` with alphabetical tie-breaking | `200`, `401` |

### 5. Badges & Cross-Habit Correlation
| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/badges` | Protected | Computed achievement badges (`first_checkin`, `streak_7_days`, `streak_30_days`, `streak_4_weeks`, `checkins_100`, `comeback`) | `200`, `401` |
| `GET` | `/api/insights/correlation` | Protected | Habit pair correlation & lift metric (`?a=&b=&days=90`) | `200`, `400`, `401` |
| `GET` | `/api/insights/correlations` | Protected | Top correlated habit pairs ranked by lift | `200`, `401` |

---

## Automated Tests & Verification

The test suite runs using Node.js built-in test runner (`node:test`) with **zero external dependencies** and **no MongoDB connection required**, ensuring fast, deterministic offline execution.

### Run Unit Tests
```bash
cd server
npm test
```

### Test Coverage Highlights (`server/tests/analytics.test.js`)
- **`fillZeroDays`**:
  - Verifies exactly 90 items ending today UTC.
  - Verifies 0 is filled for missing days.
  - Verifies handling of empty input arrays.
  - Verifies parsing of MongoDB aggregation `_id` keys.
- **`pickMostLeast`**:
  - Covers 0 habits $\rightarrow$ `{ most: null, least: null, message: "No habits yet" }`.
  - Covers 1 habit $\rightarrow$ `{ most, least: null, message: "Add more habits to compare" }`.
  - Covers all-equal counts $\rightarrow$ `{ most: alphabeticalFirst, least: null, message: "All habits are equally active" }`.
  - Covers 2+ distinct habits $\rightarrow$ distinct most and least with `message: null`.
  - Covers alphabetical tie-breaking for both most and least active.
- **`computeStreaksFromRuns`**:
  - Covers no logs $\rightarrow$ `{ currentStreak: 0, longestStreak: 0 }`.
  - Covers single log ending today, ending yesterday, and ended 2+ days ago.
  - Covers runs with gaps in the middle:
    - Streak ending today: current streak maintained.
    - Streak ending yesterday: in-progress streak maintained.
    - Streak ended 2+ days ago: current streak drops to 0 while longest streak is preserved.

---

## Continuous Integration (CI)

The GitHub Actions workflow is located at [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
On every `push` and `pull_request` to `main`:
1. Sets up Node.js 20.
2. In `server/`: runs `npm ci` and `npm test` (offline unit tests, no secrets, no MongoDB connection).
3. In `client/`: runs `npm ci` and `npm run build` (Vite production bundle verification).
