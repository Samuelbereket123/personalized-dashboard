<template>
  <div>
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Here's what's going on this week</p>
    </div>

    <!-- Stats row -->
    <div class="grid-4" style="margin-bottom: 20px;">
      <div class="card stat-card">
        <div class="stat-icon green">
          <CalendarDays :size="18" />
        </div>
        <div>
          <div class="stat-value">{{ stats.sessionsThisWeek }}</div>
          <div class="stat-label">Sessions this week</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon teal">
          <Clock :size="18" />
        </div>
        <div>
          <div class="stat-value">{{ stats.hoursStudied }}h</div>
          <div class="stat-label">Hours studied</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon lime">
          <CheckCircle :size="18" />
        </div>
        <div>
          <div class="stat-value">{{ stats.completionRate }}%</div>
          <div class="stat-label">Completion rate</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon emerald">
          <Wallet :size="18" />
        </div>
        <div>
          <div class="stat-value">{{ stats.weeklySpend }} ETB</div>
          <div class="stat-label">Spent this week</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Today's schedule -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">Today's Sessions</span>
          <NuxtLink to="/schedule" class="card-link">View all</NuxtLink>
        </div>
        <div v-if="todaySessions.length === 0" class="empty-state">
          <CalendarDays :size="32" />
          <p>No sessions today</p>
        </div>
        <div v-else class="session-list">
          <div v-for="s in todaySessions" :key="s.id" class="session-row">
            <div class="session-time">{{ formatTime(s.start_time) }}</div>
            <div class="session-info">
              <div class="session-subject">{{ s.subject }}</div>
              <div class="session-topic">{{ s.topic || 'General' }}</div>
            </div>
            <span :class="['badge', statusBadge(s.status)]">{{ s.status }}</span>
          </div>
        </div>
      </div>

      <!-- Budget breakdown -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">This Week's Spending</span>
          <NuxtLink to="/budget" class="card-link">View all</NuxtLink>
        </div>
        <div v-if="budgetByCategory.length === 0" class="empty-state">
          <Wallet :size="32" />
          <p>No expenses logged</p>
        </div>
        <div v-else class="budget-breakdown">
          <div v-for="cat in budgetByCategory" :key="cat.name" class="budget-row">
            <div class="budget-cat-info">
              <span class="budget-dot" :style="{ background: cat.color }" />
              <span class="budget-cat-name">{{ cat.name }}</span>
            </div>
            <div class="budget-bar-wrap">
              <div class="budget-bar" :style="{ width: cat.pct + '%', background: cat.color }" />
            </div>
            <span class="budget-amount">{{ cat.total }} ETB</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming sessions -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-head">
        <span class="card-title">Upcoming This Week</span>
      </div>
      <div v-if="upcomingSessions.length === 0" class="empty-state">
        <p>No upcoming sessions — go add some in Schedule</p>
      </div>
      <div v-else class="upcoming-grid">
        <div v-for="s in upcomingSessions" :key="s.id" class="upcoming-card">
          <div class="upcoming-date">{{ formatDate(s.date) }}</div>
          <div class="upcoming-subject">{{ s.subject }}</div>
          <div class="upcoming-time">{{ formatTime(s.start_time) }} – {{ formatTime(s.end_time) }}</div>
          <span :class="['badge', statusBadge(s.status)]">{{ s.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, Clock, CheckCircle, Wallet } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()

const sessions = ref<any[]>([])
const budgetEntries = ref<any[]>([])

const weekStart = computed((): string => {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().split('T')[0] as string
})

const weekEnd = computed((): string => {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0] as string
})

const todayStr = new Date().toISOString().split('T')[0] as string

const todaySessions = computed(() =>
  sessions.value.filter(s => s.date === todayStr)
)

const upcomingSessions = computed(() =>
  sessions.value.filter(s => s.date > todayStr && s.date <= weekEnd.value).slice(0, 6)
)

const catColors: Record<string, string> = {
  transportation: '#16a34a',
  food: '#4ade80',
  supplies: '#86efac',
  other: '#bbf7d0',
}

const budgetByCategory = computed(() => {
  const map: Record<string, number> = {}
  const weekBudget = budgetEntries.value.filter(b => b.date >= weekStart.value && b.date <= weekEnd.value)
  weekBudget.forEach(b => {
    map[b.category] = (map[b.category] || 0) + Number(b.amount)
  })
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1
  return Object.entries(map).map(([name, t]) => ({
    name,
    total: t.toFixed(2),
    pct: Math.round((t / total) * 100),
    color: catColors[name] || '#86efac',
  }))
})

const stats = computed(() => {
  const weekSessions = sessions.value.filter(s => s.date >= weekStart.value && s.date <= weekEnd.value)
  const done = weekSessions.filter(s => s.status === 'done')
  const hours = done.reduce((acc, s) => {
    const parts = s.start_time.split(':').map(Number)
    const eparts = s.end_time.split(':').map(Number)
    const sh = parts[0] ?? 0, sm = parts[1] ?? 0
    const eh = eparts[0] ?? 0, em = eparts[1] ?? 0
    return acc + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)
  const weekBudget = budgetEntries.value.filter(b => b.date >= weekStart.value && b.date <= weekEnd.value)
  const spend = weekBudget.reduce((a, b) => a + Number(b.amount), 0)
  return {
    sessionsThisWeek: weekSessions.length,
    hoursStudied: hours.toFixed(1),
    completionRate: weekSessions.length ? Math.round((done.length / weekSessions.length) * 100) : 0,
    weeklySpend: spend.toFixed(2),
  }
})

function formatTime(t: string) {
  const parts = t.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function statusBadge(s: string) {
  return s === 'done' ? 'badge-green' : s === 'skipped' ? 'badge-red' : 'badge-gray'
}

onMounted(async () => {
  const [{ data: s }, { data: b }] = await Promise.all([
    supabase.from('study_sessions').select('*').order('date').order('start_time'),
    supabase.from('budget_entries').select('*').order('date', { ascending: false }),
  ])
  sessions.value = s || []
  budgetEntries.value = b || []
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.green { background: var(--green-100); color: var(--green-700); }
.stat-icon.teal { background: #d1fae5; color: #065f46; }
.stat-icon.lime { background: #ecfdf5; color: #047857; }
.stat-icon.emerald { background: var(--green-200); color: var(--green-800); }

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 3px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-link {
  font-size: 12px;
  color: var(--green-600);
  font-weight: 500;
}

.card-link:hover {
  color: var(--green-700);
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--off-white);
  border-radius: 8px;
}

.session-time {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 60px;
}

.session-info {
  flex: 1;
}

.session-subject {
  font-size: 14px;
  font-weight: 500;
}

.session-topic {
  font-size: 12px;
  color: var(--text-muted);
}

.budget-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.budget-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.budget-cat-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 110px;
}

.budget-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.budget-cat-name {
  font-size: 13px;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.budget-bar-wrap {
  flex: 1;
  height: 6px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.budget-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.budget-amount {
  font-size: 13px;
  font-weight: 500;
  min-width: 70px;
  text-align: right;
}

.upcoming-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.upcoming-card {
  background: var(--off-white);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upcoming-date {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.upcoming-subject {
  font-size: 14px;
  font-weight: 600;
}

.upcoming-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.badge-red {
  background: #fee2e2;
  color: #dc2626;
}
</style>


