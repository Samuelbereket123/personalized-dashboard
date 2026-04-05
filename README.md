# StudyDesk

A personal study dashboard built with Nuxt 4, Supabase, and a math-based weekly analysis engine. Designed to help you plan study sessions, track spending, and review your week — all in one clean, minimal interface.

![Stack](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat&logo=nuxt.js) ![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat&logo=supabase) ![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat&logo=typescript)

---

## Features

### Schedule
- Mini calendar with month navigation — click any day to view its timeline
- Full day timeline view from 5 AM to midnight with sessions rendered at their exact time positions
- Live "now" indicator that auto-scrolls to the current time
- Add, edit, and delete sessions with subject, topic, time range, status, and notes
- Status tracking: Planned / Done / Skipped
- Realtime sync via Supabase — changes reflect instantly across tabs

### Budget Tracker
- Weekly expense log grouped by date with category icons
- Categories: Transport, Food, Supplies, Other
- Per-category spending breakdown with percentage share
- Daily bar chart showing spending distribution across the week
- Set weekly budget limits per category — turns orange at 80%, red at 100%
- Filter expenses by category
- Edit and delete individual entries
- Limits saved to localStorage — persist across sessions

### Weekly Analysis
- Zero AI, zero API cost — pure math engine
- Calculates a score out of 100 based on:
  - Completion rate (40 pts)
  - Hours studied vs 14h/week target (30 pts)
  - Days active out of 7 (20 pts)
  - Subject diversity (10 pts)
- Grades: Excellent / Good / Average / Needs Work / Poor
- Dynamic written insights based on your actual numbers
- 3 specific, actionable recommendations generated from weak areas
- Budget donut chart and subject breakdown bars

### Dashboard
- At-a-glance stats: sessions this week, hours studied, completion rate, weekly spend
- Today's sessions and upcoming sessions for the week
- Budget breakdown with progress bars per category

### General
- Fully responsive — collapses to hamburger nav on mobile
- Dark green sidebar, white content area — minimal and clean
- Confirm dialog before any destructive clear action
- ETB currency throughout

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Nuxt 4 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime |
| Icons | lucide-vue-next |
| Fonts | Inter (Google Fonts) |
| Styling | Scoped CSS with CSS variables |

---

## Project Structure

```
study-app/
├── app/
│   ├── assets/css/main.css       # Global styles, CSS variables, utility classes
│   ├── components/
│   │   └── ConfirmDialog.vue     # Reusable confirm modal
│   ├── layouts/
│   │   └── default.vue           # Sidebar + topbar shell
│   └── pages/
│       ├── index.vue             # Dashboard
│       ├── schedule.vue          # Calendar + timeline
│       ├── budget.vue            # Budget tracker
│       └── analysis.vue         # Weekly analysis report
├── server/api/
│   └── analyze.post.ts           # (Optional) DeepSeek API proxy
├── supabase/
│   └── schema.sql                # Database schema
├── nuxt.config.ts
└── .env                          # Not committed — see setup below
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Samuelbereket123/personalized-dashboard.git
cd personalized-dashboard
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New snippet**
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Project Settings → API** and copy your Project URL and anon key

### 3. Configure environment variables

Create a `.env` file in the root:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your_anon_public_key
DEEPSEEK_API_KEY=your_deepseek_key   # Optional — only needed if using AI analysis
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Schema

```sql
-- Study sessions
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'planned',  -- planned | done | skipped
  notes text,
  created_at timestamptz default now()
);

-- Budget entries
create table budget_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null,          -- transportation | food | supplies | other
  description text,
  amount numeric(10,2) not null,
  date date not null,
  created_at timestamptz default now()
);

-- Cached AI analyses (optional)
create table weekly_analyses (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  analysis_text text not null,
  created_at timestamptz default now()
);
```

---

## Weekly Analysis Engine

The analysis runs entirely client-side with no external API. It calculates a weekly score from four metrics:

| Metric | Weight | Target |
|---|---|---|
| Completion rate | 40 pts | 100% of planned sessions done |
| Hours studied | 30 pts | 14h/week (2h/day) |
| Consistency | 20 pts | Active all 7 days |
| Subject diversity | 10 pts | 4+ different subjects |

Based on the score and your actual data, it generates written insights (color-coded green/yellow/red) and 3 specific recommendations tailored to what's actually weak that week.

If you want to use DeepSeek AI instead, add your `DEEPSEEK_API_KEY` to `.env` and call `/api/analyze` from the analysis page — the server route is already set up in `server/api/analyze.post.ts`.

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run generate   # Static site generation
npm run preview    # Preview production build
```

---

## License

MIT
