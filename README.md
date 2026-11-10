# HabitGraph - Habit Tracker with Streak Visualization (MERN)

> **Course**: Full Stack Application Development (MCA, RVCE)  
> **Repository**: [https://github.com/Indianpatriot/habit-tracker](https://github.com/Indianpatriot/habit-tracker)  
> **Stack**: MongoDB Atlas + Express + React 19 + Node.js (MERN)

HabitGraph is a habit tracking web application featuring GitHub-style streak visualization heatmaps built with clean MERN architecture strictly adhering to RVCE MCA course constraints.

---

## Technical Specifications & Viva Compliance

1. **Frontend Architecture**:
   - **Language**: Plain JavaScript + JSX (Zero TypeScript).
   - **Styles**: Plain CSS files only (`client/src/index.css`) — no Tailwind, no shadcn, no UI frameworks.
   - **Framework & Router**: Vite + React 19 + `react-router-dom` (v7) with nested route structure.
   - **Component Patterns**:
     - **Class Components**: `AddHabitForm` uses `this.state` and `this.setState` for controlled state and validation; `ErrorBoundary` uses `getDerivedStateFromError` and `componentDidCatch`.
     - **Child-to-Parent Communication**: `HabitCard` receives and triggers `onMarkDone(habitId)` and `onUndo(habitId)` callbacks from `Dashboard`.
     - **URL Query Synchronization**: `Dashboard` binds habit filtering directly to `?q=` using the `useSearchParams` hook.
     - **Type Safety**: Runtime validation via `prop-types` implemented on every component accepting props.
   - **Pure SVG Visualization**: `Heatmap.jsx` renders a 90-day matrix in weekly columns (`x = weekIndex * cell`, `y = weekday * cell`) with Sunday–Saturday weekday offset padding, 5 green shades (`#ebedf0` to `#216e39`), month labels, weekday axes, and `<title>` tooltips with **zero external chart or heatmap libraries**.

2. **Backend Architecture**:
   - **Modular CommonJS**: All server code uses `require` and `module.exports`.
   - **Security**: Passwords hashed with `bcryptjs` salt rounds; authenticated endpoints protected via JWT Bearer token middleware (`server/middleware/auth.js`).
   - **Central Error Handling**: Express central middleware ([`server/middleware/errorHandler.js`](server/middleware/errorHandler.js)) ensuring clean `{ message }` JSON responses.

3. **Mongoose Models & MongoDB Atlas**:
   - **User**: `name`, `email` (unique, lowercase, trim), `password` (hashed with bcrypt, minlength 6), `createdAt`.
   - **Habit**: `userId` (ObjectId ref User), `name` (trim, minlength 2), `createdAt`.
   - **Log**:
     - `habitId`: ObjectId ref Habit.
     - `userId`: ObjectId ref User.
     - `date`: Custom **setter** normalising any incoming date to UTC midnight (`00:00:00.000Z`) avoiding timezone shifts; custom **getter** returning `"YYYY-MM-DD"` string (with `{ toJSON: { getters: true } }`).
     - **Compound Unique Index**: `{ habitId: 1, date: 1 }` preventing duplicate habit check-ins on the same day.

---

## REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user, hash password, return JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user, return JWT |
| `GET` | `/api/auth/me` | Private | Retrieve current user profile |

### Habits (`/api/habits`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/habits?q=` | Private | List habits with optional search query |
| `POST` | `/api/habits` | Private | Create habit (`{ name }`) |
| `GET` | `/api/habits/:id` | Private | Get single habit details |
| `PUT` | `/api/habits/:id` | Private | Update habit name |
| `DELETE` | `/api/habits/:id` | Private | Delete habit and cascade delete logs |
| `GET` | `/api/habits/:id/stats` | Private | Calculate current streak, longest streak, 30-day rate |

### Habit Logs (`/api/logs`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/logs` | Private | Record check-in for date (`{ habitId, date }`) |
| `DELETE` | `/api/logs/:habitId` | Private | Undo check-in for date (`?date=YYYY-MM-DD`) |
| `GET` | `/api/logs/heatmap` | Private | 90-day activity matrix (overall or `?habitId=`) |

---

## Repository Structure

```text
fsad/
├── client/                     # Vite + React 19 Frontend
│   ├── src/
│   │   ├── components/         # Pure SVG Heatmap, Class Components, Cards
│   │   │   ├── AddHabitForm.jsx  # Class component (this.state / setState)
│   │   │   ├── ErrorBoundary.jsx # Class component error boundary
│   │   │   ├── HabitCard.jsx     # Card with child-to-parent callbacks
│   │   │   ├── Heatmap.jsx       # Pure SVG 90-day heatmap (no charting lib)
│   │   │   ├── Layout.jsx        # App layout shell with navbar & outlet
│   │   │   ├── Navbar.jsx        # Navigation bar with auth logout
│   │   │   └── ProtectedRoute.jsx# Auth route guard
│   │   ├── pages/              # Route views
│   │   │   ├── AddHabitPage.jsx# Route wrapper for AddHabitForm
│   │   │   ├── Dashboard.jsx   # / with URL query (?q=) searchParams filter
│   │   │   ├── EditHabit.jsx   # /habits/:id/edit with confirm delete
│   │   │   ├── HabitDetail.jsx # /habits/:id with stats strip & filtered heatmap
│   │   │   ├── HeatmapPage.jsx # /heatmap global 90-day activity matrix
│   │   │   ├── Login.jsx       # /login controlled form with validation
│   │   │   ├── NotFound.jsx    # 404 fallback page
│   │   │   └── Register.jsx    # /register controlled form with validation
│   │   ├── api.js              # Full fetch API client with Bearer token
│   │   ├── App.jsx             # Router and nested routes configuration
│   │   └── index.css           # Plain, responsive CSS (no Tailwind/UI kits)
│   └── package.json
├── server/                     # Node.js + Express + Mongoose (CommonJS)
│   ├── config/
│   │   └── db.js               # Mongoose Atlas connection handler
│   ├── controllers/            # Business logic (auth, habits, logs, stats)
│   │   ├── authController.js
│   │   ├── habitController.js
│   │   └── logController.js
│   ├── middleware/             # Express middlewares
│   │   ├── auth.js             # JWT Bearer token protection
│   │   └── errorHandler.js     # Central error handling middleware
│   ├── models/                 # Mongoose Schemas (User, Habit, Log)
│   │   ├── Habit.js
│   │   ├── Log.js
│   │   └── User.js
│   ├── routes/                 # Express REST routers
│   │   ├── authRoutes.js
│   │   ├── habitRoutes.js
│   │   └── logRoutes.js
│   ├── index.js                # Server entry point
│   └── package.json
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── package.json                # Root package.json with concurrently
└── README.md                   # Project documentation
```

---

## Local Setup & Quickstart

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v26)
- **npm**: v9+
- A **MongoDB Atlas** cluster connection URI

### 2. Configure Environment
Create `server/.env`:
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
PORT=5000
JWT_SECRET=supersecretphase2jwtkey12345
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Run Both Client & Server Concurrently
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API**: [http://localhost:5000/](http://localhost:5000/)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
