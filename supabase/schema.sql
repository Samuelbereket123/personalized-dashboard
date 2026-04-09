-- Study Sessions
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'planned', -- planned | done | skipped
  notes text,
  created_at timestamptz default now()
);

-- Budget Entries
create table if not exists budget_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- transportation | food | supplies | other
  description text,
  amount numeric(10,2) not null,
  date date not null,
  created_at timestamptz default now()
);

-- Weekly Analysis (cached AI responses)
create table if not exists weekly_analyses (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  analysis_text text not null,
  created_at timestamptz default now()
);

-- Journal entries
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text not null,
  mood text default 'neutral', -- focused | motivated | tired | stressed | distracted | neutral
  date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists bible_progress (
  id uuid primary key default gen_random_uuid(),
  book text not null,
  chapter int not null,
  read_at date not null default current_date,
  created_at timestamptz default now(),
  unique(book, chapter)
);
