<template>
  <div>
    <div class="page-header">
      <h1>Weekly Analysis</h1>
      <p>AI-powered breakdown of your study habits and spending</p>
    </div>

    <!-- Week nav -->
    <div class="week-nav card" style="margin-bottom:16px;">
      <button class="btn btn-ghost" @click="prevWeek"><ChevronLeft :size="16" /></button>
      <span class="week-label">{{ weekLabel }}</span>
      <button class="btn btn-ghost" @click="nextWeek"><ChevronRight :size="16" /></button>
    </div>

    <!-- Stats summary -->
    <div class="grid-4" style="margin-bottom:20px;">
      <div class="card stat-mini">
        <div class="stat-mini-val">{{ weekStats.total }}</div>
        <div class="stat-mini-label">Sessions planned</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-val green">{{ weekStats.done }}</div>
        <div class="stat-mini-label">Completed</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-val red">{{ weekStats.skipped }}</div>
        <div class="stat-mini-label">Skipped</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-val">{{ weekStats.hours }}h</div>
        <div class="stat-mini-label">Hours studied</div>
      </div>
    </div>

    <!-- Subject breakdown -->
    <div class="grid-2" style="margin-bottom:16px;">
      <div class="card">
        <div class="section-title">Study by Subject</div>
        <div v-if="subjectBreakdown.length === 0" class="empty-state">
          <p>No sessions this week</p>
        </div>
        <div v-else class="subject-list">
          <div v-for="sub in subjectBreakdown" :key="sub.name" class="subject-row">
            <div class="subject-name">{{ sub.name }}</div>
            <div class="subject-bar-wrap">
              <div class="subject-bar" :style="{ width: sub.pct + '%' }" />
            </div>
            <div class="subject-hours">{{ sub.hours }}h</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Budget This Week</div>
        <div v-if="donutSegments.length === 0" class="empty-state">
          <p>No expenses this week</p>
        </div>
        <div v-else>
          <div class="budget-total">{{ weekBudgetTotal }} ETB total</div>
          <div class="donut-wrap">
            <svg viewBox="0 0 100 100" class="donut-svg">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#f0fdf4" stroke-width="16" />
              <circle
                v-for="(seg, i) in donutSegments"
                :key="i"
                cx="50" cy="50" r="38"
                fill="none"
                :stroke="seg.color"
                stroke-width="16"
                :stroke-dasharray="`${seg.dash} ${seg.gap}`"
                :stroke-dashoffset="seg.offset"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div class="donut-legend">
              <div v-for="seg in donutSegments" :key="seg.name" class="legend-item">
                <span class="legend-dot" :style="{ background: seg.color }" />
                <span>{{ seg.name }}</span>
                <span class="legend-pct">{{ seg.pct }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analysis -->
    <div class="card ai-card">
      <div class="ai-header">
        <div class="ai-title-row">
          <div class="ai-badge">
            <BarChart2 :size="14" />
            Smart Analysis
          </div>
          <span class="section-title" style="margin:0;">Weekly Report</span>
        </div>
        <button class="btn btn-primary" @click="runAnalysis">
          <RefreshCw :size="15" />
          Generate Report
        </button>
        <button v-if="report" class="btn btn-ghost" style="color:#dc2626; border-color:#fecaca;" @click="showClear = true">
          <Trash2 :size="15" /> Clear
        </button>
      </div>

      <ConfirmDialog
        v-model="showClear"
        title="Clear this report?"
        message="The generated report will be removed. You can always regenerate it."
        @confirm="report = null"
      />

      <div v-if="!report" class="ai-empty">
        <BarChart2 :size="36" style="opacity:0.2; margin-bottom:8px;" />
        <p>Click "Generate Report" to get your weekly breakdown</p>
      </div>

      <div v-else class="report-grid">
        <!-- Score card -->
        <div class="score-card">
          <div class="score-ring-wrap">
            <svg viewBox="0 0 80 80" class="score-ring">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#f0fdf4" stroke-width="8" />
              <circle
                cx="40" cy="40" r="32"
                fill="none"
                :stroke="scoreColor"
                stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="`${report.score * 2.01} 201`"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div class="score-inner">
              <div class="score-num" :style="{ color: scoreColor }">{{ report.score }}</div>
              <div class="score-label">/100</div>
            </div>
          </div>
          <div class="score-grade" :style="{ color: scoreColor }">{{ report.grade }}</div>
          <div class="score-sub">Weekly Score</div>
        </div>

        <!-- Insights -->
        <div class="insights-col">
          <div v-for="(insight, i) in report.insights" :key="i" :class="['insight-row', `insight-${insight.type}`]">
            <component :is="insightIcon(insight.type)" :size="15" class="insight-icon" />
            <span>{{ insight.text }}</span>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="recs-col">
          <div class="recs-title">Recommendations</div>
          <div v-for="(rec, i) in report.recommendations" :key="i" class="rec-row">
            <span class="rec-num">{{ (i as number) + 1 }}</span>
            <span>{{ rec }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, BarChart2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()
const sessions = ref<any[]>([])
const budgetEntries = ref<any[]>([])
const report = ref<any>(null)
const showClear = ref(false)
const currentWeekOffset = ref(0)

const weekStart = computed((): string => {
  const d = new Date()
  d.setDate(d.getDate() + currentWeekOffset.value * 7)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0] as string
})

const weekEnd = computed((): string => {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0] as string
})

const weekLabel = computed(() => {
  const s = new Date(String(weekStart.value) + 'T00:00:00')
  const e = new Date(String(weekEnd.value) + 'T00:00:00')
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
})

const weekSessions = computed(() =>
  sessions.value.filter(s => s.date >= weekStart.value && s.date <= weekEnd.value)
)

const weekBudget = computed(() =>
  budgetEntries.value.filter(b => b.date >= weekStart.value && b.date <= weekEnd.value)
)

const weekStats = computed(() => {
  const done = weekSessions.value.filter(s => s.status === 'done')
  const skipped = weekSessions.value.filter(s => s.status === 'skipped')
  const hours = done.reduce((acc, s) => {
    const sp = s.start_time.split(':').map(Number)
    const ep = s.end_time.split(':').map(Number)
    const sh = sp[0] ?? 0, sm = sp[1] ?? 0
    const eh = ep[0] ?? 0, em = ep[1] ?? 0
    return acc + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)
  return {
    total: weekSessions.value.length,
    done: done.length,
    skipped: skipped.length,
    hours: hours.toFixed(1),
  }
})

const subjectBreakdown = computed(() => {
  const map: Record<string, number> = {}
  weekSessions.value.filter(s => s.status === 'done').forEach(s => {
    const sp = s.start_time.split(':').map(Number)
    const ep = s.end_time.split(':').map(Number)
    const sh = sp[0] ?? 0, sm = sp[1] ?? 0
    const eh = ep[0] ?? 0, em = ep[1] ?? 0
    const h = (eh * 60 + em - sh * 60 - sm) / 60
    map[s.subject] = (map[s.subject] || 0) + h
  })
  const max = Math.max(...Object.values(map), 0.1)
  return Object.entries(map).map(([name, hours]) => ({
    name,
    hours: hours.toFixed(1),
    pct: Math.round((hours / max) * 100),
  })).sort((a, b) => Number(b.hours) - Number(a.hours))
})

const weekBudgetTotal = computed(() =>
  weekBudget.value.reduce((a, b) => a + Number(b.amount), 0).toFixed(2)
)

const catColors: Record<string, string> = {
  transportation: '#16a34a',
  food: '#4ade80',
  supplies: '#86efac',
  other: '#bbf7d0',
}

const donutSegments = computed(() => {
  const map: Record<string, number> = {}
  weekBudget.value.forEach(b => {
    map[b.category] = (map[b.category] || 0) + Number(b.amount)
  })
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1
  const circumference = 2 * Math.PI * 38
  let offset = 0
  return Object.entries(map).map(([name, amount]) => {
    const pct = amount / total
    const dash = pct * circumference
    const seg = {
      name,
      color: catColors[name] || '#86efac',
      dash,
      gap: circumference - dash,
      offset: -offset,
      pct: Math.round(pct * 100),
    }
    offset += dash
    return seg
  })
})

// ── Pure math analysis engine ──
function sessionMinutes(s: any): number {
  const sp = s.start_time.split(':').map(Number)
  const ep = s.end_time.split(':').map(Number)
  const sh = sp[0] ?? 0, sm = sp[1] ?? 0
  const eh = ep[0] ?? 0, em = ep[1] ?? 0
  return eh * 60 + em - sh * 60 - sm
}

function runAnalysis() {
  const ws = weekSessions.value
  const wb = weekBudget.value

  if (ws.length === 0 && wb.length === 0) {
    report.value = {
      score: 0,
      grade: 'N/A',
      insights: [{ type: 'warn', text: 'No data logged this week. Start adding sessions and expenses.' }],
      recommendations: [
        'Add at least 3 study sessions to the schedule.',
        'Log your daily expenses to track spending.',
        'Set weekly budget limits per category.',
      ]
    }
    return
  }

  const done = ws.filter(s => s.status === 'done')
  const skipped = ws.filter(s => s.status === 'skipped')
  const totalMins = done.reduce((a, s) => a + sessionMinutes(s), 0)
  const totalHours = totalMins / 60
  const completionRate = ws.length > 0 ? done.length / ws.length : 0

  // Days with at least one done session
  const activeDays = new Set(done.map(s => s.date)).size

  // Subject diversity
  const subjects = new Set(ws.map(s => s.subject)).size

  // Score calculation (out of 100)
  // 40pts: completion rate, 30pts: hours studied (target 14h/week = 2h/day), 20pts: consistency (days active), 10pts: diversity
  const completionScore = Math.round(completionRate * 40)
  const hoursScore = Math.round(Math.min(totalHours / 14, 1) * 30)
  const consistencyScore = Math.round((activeDays / 7) * 20)
  const diversityScore = Math.round(Math.min(subjects / 4, 1) * 10)
  const score = completionScore + hoursScore + consistencyScore + diversityScore

  const grade =
    score >= 90 ? 'Excellent' :
    score >= 75 ? 'Good' :
    score >= 55 ? 'Average' :
    score >= 35 ? 'Needs Work' : 'Poor'

  // Build insights
  const insights: { type: string; text: string }[] = []

  // Completion
  if (completionRate === 1 && ws.length > 0)
    insights.push({ type: 'good', text: `Perfect week — all ${done.length} sessions completed.` })
  else if (completionRate >= 0.75)
    insights.push({ type: 'good', text: `${done.length} of ${ws.length} sessions done (${Math.round(completionRate * 100)}% completion rate).` })
  else if (completionRate >= 0.5)
    insights.push({ type: 'warn', text: `Only ${done.length} of ${ws.length} sessions completed. ${skipped.length} skipped.` })
  else if (ws.length > 0)
    insights.push({ type: 'bad', text: `Low completion — ${skipped.length} sessions skipped out of ${ws.length}. That's a problem.` })

  // Hours
  if (totalHours >= 14)
    insights.push({ type: 'good', text: `Strong study volume — ${totalHours.toFixed(1)}h this week (above the 14h target).` })
  else if (totalHours >= 7)
    insights.push({ type: 'warn', text: `${totalHours.toFixed(1)}h studied this week. Aim for at least 14h (2h/day).` })
  else if (ws.length > 0)
    insights.push({ type: 'bad', text: `Only ${totalHours.toFixed(1)}h studied. That's not enough to make real progress.` })

  // Consistency
  if (activeDays >= 6)
    insights.push({ type: 'good', text: `Studied ${activeDays} days this week — very consistent.` })
  else if (activeDays >= 4)
    insights.push({ type: 'warn', text: `Active ${activeDays} out of 7 days. Try to study every day, even 30 mins counts.` })
  else if (done.length > 0)
    insights.push({ type: 'bad', text: `Only studied ${activeDays} day${activeDays !== 1 ? 's' : ''} this week. Consistency is key.` })

  // Subject spread
  if (subjects >= 4)
    insights.push({ type: 'good', text: `Covered ${subjects} different subjects — good variety.` })
  else if (subjects === 1 && ws.length > 0)
    insights.push({ type: 'warn', text: `All sessions focused on one subject. Don't neglect other areas.` })

  // Budget insights
  if (wb.length > 0) {
    const total = wb.reduce((a, b) => a + Number(b.amount), 0)
    const catMap: Record<string, number> = {}
    wb.forEach(b => { catMap[b.category] = (catMap[b.category] || 0) + Number(b.amount) })
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
    if (!topCat) return
    const topPct = Math.round((topCat[1] / total) * 100)

    if (topPct > 60)
      insights.push({ type: 'warn', text: `${topPct}% of spending went to ${topCat[0]} (${topCat[1].toFixed(0)} ETB). Consider balancing.` })
    else
      insights.push({ type: 'good', text: `Spending spread across categories. Total: ${total.toFixed(0)} ETB this week.` })
  }

  // Recommendations
  const recs: string[] = []

  if (completionRate < 0.8 && ws.length > 0)
    recs.push(`You skipped ${skipped.length} session${skipped.length !== 1 ? 's' : ''}. Before adding new sessions, commit to finishing what's already planned.`)

  if (totalHours < 10 && ws.length > 0)
    recs.push(`Increase study time — aim for at least 2 focused hours per day. Even short sessions add up.`)

  if (activeDays < 5 && done.length > 0)
    recs.push(`Study more consistently. Spread sessions across the week instead of cramming into ${activeDays} days.`)

  if (subjects === 1 && ws.length > 0)
    recs.push(`Diversify your subjects. Focusing only on one area leaves gaps in your overall progress.`)

  if (ws.length === 0)
    recs.push(`No sessions logged this week. Open the Schedule page and plan your week ahead.`)

  if (wb.length === 0)
    recs.push(`Start logging your expenses. Even rough numbers help you see where your money goes.`)

  // Fill to 3 recs minimum
  const fallbacks = [
    'Review your notes from completed sessions before the next one.',
    'Set a fixed study time each day to build a habit.',
    'Track your expenses daily — it takes 30 seconds.',
  ]
  let fi = 0
  while (recs.length < 3 && fi < fallbacks.length) {
    const fb = fallbacks[fi++]
    if (fb) recs.push(fb)
  }

  report.value = { score, grade, insights, recommendations: recs.slice(0, 3) }
}

const scoreColor = computed(() => {
  if (!report.value) return '#16a34a'
  const s = report.value.score
  if (s >= 75) return '#16a34a'
  if (s >= 50) return '#d97706'
  return '#dc2626'
})

function insightIcon(type: string) {
  if (type === 'good') return CheckCircle2
  if (type === 'bad') return TrendingDown
  if (type === 'warn') return AlertTriangle
  return TrendingUp
}

function prevWeek() {
  currentWeekOffset.value--
  report.value = null
}

function nextWeek() {
  currentWeekOffset.value++
  report.value = null
}

onMounted(async () => {
  const [{ data: s }, { data: b }] = await Promise.all([
    supabase.from('study_sessions').select('*'),
    supabase.from('budget_entries').select('*'),
  ])
  sessions.value = s || []
  budgetEntries.value = b || []
})
</script>



<style scoped>
.week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}

.week-label {
  font-size: 14px;
  font-weight: 600;
}

.stat-mini {
  text-align: center;
  padding: 16px;
}

.stat-mini-val {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-mini-val.green { color: var(--green-600); }
.stat-mini-val.red { color: #dc2626; }

.stat-mini-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 14px;
  display: block;
}

.subject-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subject-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.subject-name {
  font-size: 13px;
  min-width: 90px;
  font-weight: 500;
}

.subject-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.subject-bar {
  height: 100%;
  background: var(--green-500);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.subject-hours {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 30px;
  text-align: right;
}

.budget-total {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
}

.donut-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
}

.donut-svg {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-pct {
  color: var(--text-muted);
  margin-left: auto;
  padding-left: 8px;
}

.ai-card {
  margin-top: 0;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.ai-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--green-100);
  color: var(--green-700);
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.ai-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Report grid */
.report-grid {
  display: grid;
  grid-template-columns: 160px 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.score-ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
}

.score-ring {
  width: 80px;
  height: 80px;
}

.score-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.score-num {
  font-size: 22px;
  font-weight: 700;
}

.score-label {
  font-size: 10px;
  color: var(--text-muted);
}

.score-grade {
  font-size: 15px;
  font-weight: 700;
}

.score-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.insights-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.insight-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
}

.insight-icon { flex-shrink: 0; margin-top: 1px; }

.insight-good { background: var(--green-50); color: var(--green-800); }
.insight-warn { background: #fffbeb; color: #92400e; }
.insight-bad { background: #fef2f2; color: #991b1b; }

.recs-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recs-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.rec-row {
  display: flex;
  gap: 10px;
  font-size: 13px;
  line-height: 1.5;
  align-items: flex-start;
}

.rec-num {
  width: 20px;
  height: 20px;
  background: var(--green-700);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

@media (max-width: 768px) {
  .report-grid {
    grid-template-columns: 1fr;
  }
}

.ai-loading {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: var(--green-400);
  border-radius: 50%;
  animation: bounce 1.2s infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1.2); opacity: 1; }
}

.ai-result {
  background: var(--off-white);
  border-radius: 10px;
  padding: 20px;
}

.analysis-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
}

.analysis-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 12px;
  text-align: right;
}

.ai-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

