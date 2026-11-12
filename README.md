# HabitGraph - Habit Tracker with Streak Visualization (MERN)

> **Course**: Full Stack Application Development (MCA, RVCE)  
> **Repository**: [https://github.com/Indianpatriot/habit-tracker](https://github.com/Indianpatriot/habit-tracker)  
> **Stack**: MongoDB Atlas + Express + React 19 + Node.js (MERN)

HabitGraph is a full-stack habit tracking web application featuring GitHub-style streak heatmaps, non-continuous goal streaks, computed achievement badges, and cross-habit correlation insights built with clean MERN architecture strictly adhering to RVCE MCA course constraints.

---

## Technical Specifications & Features

1. **Frontend Architecture**:
   - **Language**: Plain JavaScript + JSX (Zero TypeScript).
   - **Styles**: Plain CSS files only (`client/src/index.css`) — no Tailwind, no shadcn, no UI frameworks.
   - **Framework & Router**: Vite + React 19 + `react-router-dom` (v7) with nested route structure.
   - **Component Patterns**:
     - **Class Components**: `AddHabitForm` uses `this.state` and `this.setState` for controlled state, goal-type selections, and validation; `ErrorBoundary` uses `getDerivedStateFromError` and `componentDidCatch`.
     - **Child-to-Parent Communication**: `HabitCard` communicates check-in toggles via `onToggleDone` callbacks.
     - **URL Query Synchronization**: `Dashboard` binds habit filtering directly to `?q=` using the `useSearchParams` hook.
     - **Type Safety**: Runtime validation via `prop-types` implemented on every component accepting props.
   - **Pure SVG Visualization**: `Heatmap.jsx` renders a 90-day matrix in weekly columns (`x = weekIndex * cell`, `y = weekday * cell`) with Sunday–Saturday weekday offset padding, 5 green shades (`#ebedf0` to `#216e39`), month labels, weekday axes, cell selection, and `<title>` tooltips with **zero external chart or heatmap libraries**.

2. **Backend Architecture**:
   - **Modular CommonJS**: All server code uses `require` and `module.exports`.
   - **Security**: Passwords hashed with `bcryptjs` salt rounds; authenticated endpoints protected via JWT Bearer token middleware (`server/middleware/auth.js`).
   - **Central Error Handling**: Express central middleware ([`server/middleware/errorHandler.js`](server/middleware/errorHandler.js)) ensuring clean `{ message }` JSON responses with appropriate HTTP status codes.

3. **Mongoose Models & MongoDB Atlas**:
   - **User**: `name`, `email` (unique, lowercase, trim), `password` (hashed with bcrypt, minlength 6), `createdAt`.
   - **Habit**: `userId` (ObjectId ref User), `name` (trim, minlength 2), `goalType` (`'daily'` | `'weekly_target'` | `'weekdays'`), `targetPerWeek` (1-7), `weekdays` (array of numbers 0-6), `createdAt`.
   - **Log**:
     - `habitId`: ObjectId ref Habit.
     - `userId`: ObjectId ref User.
     - `date`: Custom **setter** normalising any incoming date to UTC midnight (`00:00:00.000Z`) avoiding timezone shifts; custom **getter** returning `"YYYY-MM-DD"` string (with `{ toJSON: { getters: true } }`).
     - **Compound Unique Index**: `{ habitId: 1, date: 1 }` preventing duplicate habit check-ins on the same day.

---

## Core Features & Modules

### 1. Mark-Done Completion Toggle (Bug/UX Fix)
- **Visual State**:
  - **Not done today**: Neutral outline button (`.btn-outline`), label `"Mark done"`, `aria-pressed="false"`.
  - **Done today**: Solid dark green button (`.btn-done`, matching heatmap's darkest green `#216e39`), label `"Done ✓"`, `aria-pressed="true"`.
  - **Hover Action**: Hovering on a completed button reveals `"Undo"`. Clicking again toggles un-marking.
- **Derived State**: Check-in state is derived directly from MongoDB log data for the selected date, surviving page refreshes and staying synchronized with the heatmap cell.
- **Optimistic Updates**: Changes reflect instantly on click and automatically roll back with an error alert if the network request fails.

### 2. Non-Continuous Goals & Streak Engine
- **Flexible Goal Types**:
  - `daily`: Consecutive calendar days with a check-in (unit: `"days"`).
  - `weekly_target`: Consecutive Monday-based weeks meeting `targetPerWeek` distinct check-in days (unit: `"weeks"`).
  - `weekdays`: Scheduled weekdays (e.g. Mon/Wed/Fri). Unscheduled days are skipped (they neither extend nor break streaks). Missed scheduled days break the streak (unit: `"days"`).
- **In-Progress Protection**: Active streaks do not break prematurely while today or the current week is still in progress.
- **MongoDB Aggregation Engine**:
  - Daily & weekly targets compute streaks via the **gaps-and-islands** pipeline (`$dateTrunc` with `startOfWeek: 'monday'`, `$setWindowFields` with `$documentNumber`, grouped by `periodIndex - rank`).
  - Weekdays aggregate distinct check-in dates and reduce in JS to cleanly skip unscheduled days.
- **Display**: Streak cards explicitly display the value alongside its unit (e.g. `"2 weeks"`, `"5 days"`).

### 3. Achievement Badges (`/badges`)
Computed dynamically on demand from check-in logs (no auxiliary database collection):
- `first_checkin`: First check-in ever recorded.
- `streak_7_days`: Longest streak $\ge 7$ days on any daily or weekdays habit.
- `streak_30_days`: Longest streak $\ge 30$ days on any daily or weekdays habit.
- `streak_4_weeks`: Longest streak $\ge 4$ weeks on any weekly target habit.
- `checkins_100`: 100 total check-ins across all habits.
- `comeback`: A check-in made after a gap of $\ge 7$ days on the same habit.
- **UI Presentation**: Earned badges show full color styling and the exact date earned; locked badges are greyed out with dynamic progress bars (e.g. `"42 / 100"`).

### 4. Cross-Habit Correlation Pipeline (`/insights`)
- **Single Aggregation Pipeline**: Scoped to the user across a configurable window (default 90 days, max 365). Groups by calendar day with `$addToSet` of habit IDs, derives boolean flags `doneA` / `doneB`, and groups by `doneA` to compute:
  - $P(B|A) = \frac{\text{both}}{\text{daysA}}$
  - $P(B|\neg A) = \frac{\text{daysB} - \text{both}}{\text{totalDays} - \text{daysA}}$
  - $\text{Lift} = \frac{P(B|A)}{P(B|\neg A)}$
- **Statistical Significance Guard**: Requires $\text{daysA} \ge 10$ and $(\text{totalDays} - \text{daysA}) \ge 10$. If insufficient data, displays `"Not enough data yet"` instead of misleading percentages.
- **Interactive UI**: Habit pair dropdowns, natural sentence cards (e.g. *"On days you did Workout, you also did Read 80% of the time (vs 20% on other days)"*), top 5 correlated habit pairs by lift, and the required footnote: *"Correlation is not causation."*

---

## REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user, hash password, return JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user, return JWT |
| `GET` | `/api/auth/me` | Private | Retrieve current user profile |

### Habits & Streaks (`/api/habits`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/habits?q=` | Private | List habits with today's completion status |
| `POST` | `/api/habits` | Private | Create habit (`name`, `goalType`, `targetPerWeek`, `weekdays`) |
| `GET` | `/api/habits/:id` | Private | Get single habit details |
| `PUT` | `/api/habits/:id` | Private | Update habit name and goal configurations |
| `DELETE` | `/api/habits/:id` | Private | Delete habit and cascade delete logs |
| `GET` | `/api/habits/:id/streaks`| Private | Return streak engine stats (`{ current, longest, unit }`) |
| `GET` | `/api/habits/:id/stats` | Private | Return habit streak stats and 30-day completion rate |

### Habit Logs (`/api/logs`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/logs` | Private | Record check-in for date (`{ habitId, date }`) |
| `DELETE` | `/api/logs/:habitId` | Private | Undo check-in for date (`?date=YYYY-MM-DD`) |
| `GET` | `/api/logs/heatmap` | Private | 90-day activity matrix (overall or `?habitId=`) |
| `GET` | `/api/logs/activity-summary` | Private | Summary of most and least active habits |

### Achievement Badges (`/api/badges`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/badges` | Private | Compute and return user's achievement badges |

### Insights & Correlations (`/api/insights`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/insights/correlation` | Private | Compute correlation for pair `?a=<id>&b=<id>&days=90` |
| `GET` | `/api/insights/correlations` | Private | Return top 5 habit pairs ranked by lift (`?days=90`) |

---

## Database Seeding

To populate MongoDB Atlas with realistic demo data containing all habit types and planted cross-habit correlations over ~2 years:

```bash
cd server
npm run seed
```

This creates a demo account using generic dummy names (`Alice`, `alice@example.com` / `password123`) containing:
- 1 **Daily** habit (*Morning Meditation*)
- 1 **Weekly Target** habit (*Workout*, target 3 days/week)
- 1 **Weekdays** habit (*Study Algorithms*, Mon/Wed/Fri)
- 1 **Correlated** habit (*Read*, ~80% done on workout days, ~25% on other days)
- Over **1,400+ check-in logs** spanning ~730 days ending today.

---

## Running Automated Tests

The backend test suite is built with **Jest** and verifies all streak rules, edge cases, badge boundaries, and correlation formulas.

To run tests:
```bash
cd server
npm test
```

### Test Coverage Highlights:
- **`server/tests/streaks.test.js`**:
  - Fixture A: Daily check-ins Oct 1,2,3,5,6 (2026), today Oct 6 $\rightarrow$ current 2, longest 3.
  - Fixture B: Weekly target 3 (Mon-based) with in-progress week $\rightarrow$ current 2, longest 2 weeks.
  - Fixture C: Weekdays Mon/Wed/Fri with missed Friday $\rightarrow$ current 1, longest 5 days.
  - Fixture D: Edge cases (empty check-ins, single check-in, month boundary crossings).
- **`server/tests/badges.test.js`**:
  - `first_checkin` initial unlock.
  - `checkins_100` exact boundary verification (99 vs 100 check-ins).
  - `comeback` badge triggers on $\ge 7$-day gaps on the same habit.
  - 7-day, 30-day, and 4-week streak badge validations.
- **`server/tests/insights.test.js`**:
  - 20-day window fixture ($A$ on days 1-10, $B$ on days 1-8, 12, 13 $\rightarrow P(B|A)=0.8, P(B|\neg A)=0.2, \text{lift}=4.0$).
  - Statistical significance cutoff boundary testing ($N < 10$).

---

## Local Setup & Quickstart

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v26)
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
