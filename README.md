# HabitGraph - Habit Tracker with Streak Visualization (MERN)

> **Course**: Full Stack Application Development (MCA, RVCE)  
> **Status**: Phase 1 (Frontend with Sample Data + MongoDB Atlas Setup & Schemas)

HabitGraph is a habit tracking web application featuring GitHub-style streak visualization heatmaps built with the MERN stack.

---

## Repository Structure

```text
fsad/
├── client/                     # Vite + React (JavaScript, JSX, Plain CSS)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components & Class components
│   │   │   ├── AddHabitForm.jsx  # Class component using this.state / setState
│   │   │   ├── ErrorBoundary.jsx # Class component error boundary
│   │   │   ├── HabitCard.jsx     # Card with child-to-parent callbacks
│   │   │   ├── Heatmap.jsx       # Pure SVG 90-day heatmap (no charting lib)
│   │   │   ├── Layout.jsx        # App layout shell with navbar & outlet
│   │   │   ├── Navbar.jsx        # Navigation bar with auth logout
│   │   │   └── ProtectedRoute.jsx# Auth route guard
│   │   ├── data/
│   │   │   └── sampleData.js   # 5 habits, 90-day heatmap data, streak stats
│   │   ├── pages/              # Route views
│   │   │   ├── AddHabitPage.jsx# Route wrapper for AddHabitForm
│   │   │   ├── Dashboard.jsx   # / with URL query (?q=) searchParams filter
│   │   │   ├── EditHabit.jsx   # /habits/:id/edit with confirm delete
│   │   │   ├── HabitDetail.jsx # /habits/:id with stats strip & filtered heatmap
│   │   │   ├── HeatmapPage.jsx # /heatmap global 90-day activity matrix
│   │   │   ├── Login.jsx       # /login controlled form with validation
│   │   │   ├── NotFound.jsx    # 404 fallback page
│   │   │   └── Register.jsx    # /register controlled form with validation
│   │   ├── api.js              # Mock API layer (prepared for Phase 2 fetch)
│   │   ├── App.jsx             # Router and nested routes configuration
│   │   └── index.css           # Plain, responsive CSS (no Tailwind/UI kits)
│   └── package.json
├── server/                     # Node.js + Express + Mongoose (CommonJS)
│   ├── config/
│   │   └── db.js               # Mongoose Atlas connection handler
│   ├── middleware/
│   │   └── errorHandler.js     # Central error handling middleware
│   ├── models/                 # Mongoose Schemas
│   │   ├── Habit.js            # Habit schema
│   │   ├── Log.js              # Log schema with UTC setter, getter & unique index
│   │   └── User.js             # User schema
│   ├── index.js                # Express app, CORS, Morgan, /api/health
│   ├── .env.example
│   └── package.json
├── .env.example                # Root environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Root package.json with concurrently
└── README.md                   # Project documentation
```

---

## Technical Specifications & Course Rules

- **Frontend**: Plain JavaScript with JSX (No TypeScript). Plain CSS only (No Tailwind, shadcn, or UI kits). Vite + React 19 + `react-router-dom` + `prop-types`. No Redux, no external chart or heatmap libraries.
- **Heatmap Visualization**: Pure SVG matrix rendering 90 days in weekly columns (`x = weekIndex * cell`, `y = weekday * cell`) with Sunday–Saturday weekday padding, 5 green shades (`#ebedf0` to `#216e39`), month labels, weekday axes, and `<title>` tooltips.
- **Backend**: Node.js + Express + Mongoose using CommonJS (`require` / `module.exports`).
- **Database**: Mongoose schemas configured for MongoDB Atlas:
  - `User`: name, email (unique, lowercase), password (minlength 6), createdAt.
  - `Habit`: userId (ref User), name (minlength 2), createdAt.
  - `Log`: habitId (ref Habit), userId (ref User), date (UTC midnight custom setter, YYYY-MM-DD getter), compound unique index `{ habitId: 1, date: 1 }`.

---

## Setup & Running Locally

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v26)
- **npm**: v9+
- A **MongoDB Atlas** free cluster connection URI

### 2. Install Dependencies
Run the install command from root:
```bash
npm run install:all
```
*(Or install manually in `/server` and `/client`: `cd server && npm install && cd ../client && npm install`)*

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and paste your MongoDB Atlas URI:
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/habit_tracker?retryWrites=true&w=majority
PORT=5000
```

### 4. Start the Application
Run both the Express backend and Vite frontend concurrently:
```bash
npm run dev
```

- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## Verification & Testing
- Health endpoint: `curl http://localhost:5000/api/health` returns `{"status":"ok"}`.
- Client tests: `npm run build` in `/client` builds cleanly with 0 errors.
- Client linter: `npm run lint` in `/client` passes with 0 warnings and 0 errors.

