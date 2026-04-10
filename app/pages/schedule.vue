<template>
  <div>
    <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div>
        <h1>Study Schedule</h1>
        <p>Click a day to view its timeline</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">
        <Plus :size="16" /> Add Session
      </button>
      <button class="btn btn-ghost" style="color:#dc2626; border-color:#fecaca;" @click="showClear = true">
        <Trash2 :size="15" /> Clear All
      </button>
    </div>

    <ConfirmDialog
      v-model="showClear"
      title="Clear all sessions?"
      message="This will permanently delete every study session. This cannot be undone."
      @confirm="clearAll"
    />

    <div class="schedule-layout">
      <!-- LEFT: Mini Calendar -->
      <div class="cal-panel card">
        <div class="cal-nav">
          <button class="icon-btn" @click="prevMonth"><ChevronLeft :size="16" /></button>
          <span class="cal-month-label">{{ monthLabel }}</span>
          <button class="icon-btn" @click="nextMonth"><ChevronRight :size="16" /></button>
        </div>

        <div class="cal-grid">
          <div v-for="d in ['M','T','W','T','F','S','S']" :key="d + Math.random()" class="cal-dow">{{ d }}</div>
          <div
            v-for="cell in calCells"
            :key="cell.key"
            :class="[
              'cal-cell',
              { 'cal-empty': !cell.date },
              { 'cal-today': cell.date === todayStr },
              { 'cal-selected': cell.date === selectedDate },
              { 'cal-has-sessions': cell.date && sessionDates.has(cell.date) },
            ]"
            @click="cell.date && selectDate(cell.date)"
          >
            <span v-if="cell.date">{{ cell.day }}</span>
            <span v-if="cell.date && sessionDates.has(cell.date)" class="cal-dot" />
          </div>
        </div>

        <div class="divider" />

        <!-- Legend -->
        <div class="cal-legend">
          <div class="legend-row"><span class="legend-swatch today-swatch" />Today</div>
          <div class="legend-row"><span class="legend-swatch selected-swatch" />Selected</div>
          <div class="legend-row"><span class="cal-dot" style="position:static; margin-right:6px;" />Has sessions</div>
        </div>

        <!-- Mini session list for selected date -->
        <div class="divider" />
        <div class="mini-session-list">
          <div class="mini-list-title">{{ selectedDateLabel }}</div>
          <div v-if="selectedDaySessions.length === 0" class="mini-empty">No sessions</div>
          <div v-for="s in selectedDaySessions" :key="s.id" :class="['mini-session', `mini-${s.status}`]" @click="openEdit(s)">
            <span class="mini-subject">{{ s.subject }}</span>
            <span class="mini-time">{{ formatTime(s.start_time) }}</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Day Timeline -->
      <div class="timeline-panel card">
        <div class="timeline-header">
          <div class="timeline-date-label">{{ timelineDateLabel }}</div>
          <div class="timeline-actions">
            <button class="btn btn-ghost" style="font-size:13px;" @click="openAdd">
              <Plus :size="14" /> Add
            </button>
          </div>
        </div>

        <div class="timeline-scroll" ref="timelineRef">
          <div class="timeline-body">
            <!-- Hour rows -->
            <div v-for="hour in hours" :key="hour" class="hour-row">
              <div class="hour-label">{{ formatHour(hour) }}</div>
              <div class="hour-line" />
            </div>

            <!-- Current time indicator -->
            <div
              v-if="selectedDate === todayStr"
              class="now-line"
              :style="{ top: nowLineTop + 'px' }"
            >
              <div class="now-dot" />
              <div class="now-bar" />
              <span class="now-time">{{ nowTimeLabel }}</span>
            </div>

            <!-- Session blocks -->
            <div
              v-for="s in selectedDaySessions"
              :key="s.id"
              :class="['tl-block', `tl-${s.status}`]"
              :style="blockStyle(s)"
              @click="openEdit(s)"
            >
              <div class="tl-subject">{{ s.subject }}</div>
              <div v-if="s.topic" class="tl-topic">{{ s.topic }}</div>
              <div class="tl-time">{{ formatTime(s.start_time) }} – {{ formatTime(s.end_time) }}</div>
              <div class="tl-duration">{{ duration(s) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <div class="modal-header">
          <span>{{ editingSession ? 'Edit Session' : 'New Study Session' }}</span>
          <button class="icon-btn" @click="closeForm"><X :size="18" /></button>
        </div>
        <form @submit.prevent="saveSession" class="modal-body">
          <div class="grid-2">
            <div class="form-group">
              <label>Subject *</label>
              <input v-model="form.subject" type="text" placeholder="e.g. Math, Physics" required />
            </div>
            <div class="form-group">
              <label>Topic</label>
              <input v-model="form.topic" type="text" placeholder="e.g. Derivatives" />
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Date *</label>
              <input v-model="form.date" type="date" required />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="form.status">
                <option value="planned">Planned</option>
                <option value="done">Done</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Start Time *</label>
              <input v-model="form.start_time" type="time" required />
            </div>
            <div class="form-group">
              <label>End Time *</label>
              <input v-model="form.end_time" type="time" required />
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="form.notes" rows="2" placeholder="Any notes..." />
          </div>
          <div class="modal-actions">
            <button v-if="editingSession" type="button" class="btn btn-danger" @click="deleteSession(editingSession.id)">Delete</button>
            <div style="display:flex; gap:8px; margin-left:auto;">
              <button type="button" class="btn btn-ghost" @click="closeForm">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Saving...' : editingSession ? 'Update' : 'Add Session' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const session = useSupabaseSession()
const sessions = ref<any[]>([])
const showForm = ref(false)
const showClear = ref(false)
const saving = ref(false)
const editingSession = ref<any>(null)
const timelineRef = ref<HTMLElement | null>(null)

const todayStr = new Date().toISOString().split('T')[0]
const selectedDate = ref(todayStr)
const calYear = ref(new Date().getFullYear())
const calMonth = ref(new Date().getMonth()) // 0-indexed

// Real-time clock
const now = ref(new Date())
let clockInterval: ReturnType<typeof setInterval>

onMounted(async () => {
  const { data } = await supabase.from('study_sessions').select('*').order('date').order('start_time')
  sessions.value = data || []

  clockInterval = setInterval(() => { now.value = new Date() }, 30000)

  // Scroll timeline to current hour on load
  await nextTick()
  scrollToNow()

  // Realtime subscription
  supabase.channel('study_sessions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'study_sessions' }, async () => {
      const { data } = await supabase.from('study_sessions').select('*').order('date').order('start_time')
      sessions.value = data || []
    })
    .subscribe()
})

onUnmounted(() => clearInterval(clockInterval))

// Calendar
const monthLabel = computed(() => {
  return new Date(calYear.value, calMonth.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calCells = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  // Monday-first: shift sunday (0) to 6
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1)
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push({ key: `e${i}`, date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ key: date, date, day: d })
  }
  return cells
})

const sessionDates = computed(() => new Set(sessions.value.map(s => s.date)))

function prevMonth() {
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- }
  else calMonth.value--
}

function nextMonth() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ }
  else calMonth.value++
}

function selectDate(date: string) {
  selectedDate.value = date
  nextTick(() => scrollToNow())
}

// Timeline
const HOUR_HEIGHT = 64 // px per hour
const START_HOUR = 5   // timeline starts at 5am
const END_HOUR = 24
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

const selectedDaySessions = computed(() =>
  sessions.value.filter(s => s.date === selectedDate.value)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
)

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
})

const timelineDateLabel = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  const isToday = selectedDate.value === todayStr
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + (isToday ? ' — Today' : '')
})

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function blockStyle(s: any) {
  const startMin = timeToMinutes(s.start_time)
  const endMin = timeToMinutes(s.end_time)
  const top = (startMin - START_HOUR * 60) * (HOUR_HEIGHT / 60)
  const height = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 28)
  return { top: `${top}px`, height: `${height}px` }
}

function duration(s: any) {
  const mins = timeToMinutes(s.end_time) - timeToMinutes(s.start_time)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

const nowLineTop = computed(() => {
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  return (h * 60 + m - START_HOUR * 60) * (HOUR_HEIGHT / 60)
})

const nowTimeLabel = computed(() => {
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
})

function scrollToNow() {
  if (!timelineRef.value) return
  const scrollTo = Math.max(nowLineTop.value - 120, 0)
  timelineRef.value.scrollTop = scrollTo
}

function formatHour(h: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12} ${ampm}`
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

// Form
const defaultForm = () => ({
  subject: '',
  topic: '',
  date: selectedDate.value,
  start_time: '08:00',
  end_time: '10:00',
  status: 'planned',
  notes: '',
})

const form = ref(defaultForm())

function openAdd() {
  editingSession.value = null
  form.value = defaultForm()
  form.value.date = selectedDate.value
  showForm.value = true
}

function openEdit(s: any) {
  editingSession.value = s
  form.value = { ...s }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingSession.value = null
}

async function saveSession() {
  saving.value = true
  if (editingSession.value) {
    const { error } = await supabase.from('study_sessions').update(form.value).eq('id', editingSession.value.id)
    if (!error) {
      const idx = sessions.value.findIndex(s => s.id === editingSession.value.id)
      if (idx !== -1) sessions.value[idx] = { ...editingSession.value, ...form.value }
    }
  } else {
    const { data, error } = await supabase.from('study_sessions').insert({ ...form.value, user_id: session.value?.user?.id ?? user.value?.id }).select().single()
    if (!error && data) sessions.value.push(data)
  }
  saving.value = false
  closeForm()
}

async function deleteSession(id: string) {
  await supabase.from('study_sessions').delete().eq('id', id)
  sessions.value = sessions.value.filter(s => s.id !== id)
  closeForm()
}

async function clearAll() {
  await supabase.from('study_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  sessions.value = []
}
</script>

<style scoped>
.schedule-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  align-items: start;
}

/* ── Calendar Panel ── */
.cal-panel {
  padding: 16px;
  position: sticky;
  top: 0;
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.cal-month-label {
  font-size: 13px;
  font-weight: 600;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-dow {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 4px 0;
  text-transform: uppercase;
}

.cal-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.1s;
  color: var(--text-primary);
}

.cal-cell:hover:not(.cal-empty) {
  background: var(--green-50);
}

.cal-empty {
  cursor: default;
}

.cal-today {
  background: var(--green-700) !important;
  color: white !important;
  font-weight: 700;
}

.cal-selected:not(.cal-today) {
  background: var(--green-100);
  color: var(--green-800);
  font-weight: 600;
}

.cal-dot {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--green-500);
}

.cal-today .cal-dot {
  background: white;
}

.cal-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.today-swatch { background: var(--green-700); }
.selected-swatch { background: var(--green-100); border: 1px solid var(--green-300); }

.mini-list-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.mini-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 0;
}

.mini-session {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  font-size: 12px;
  border-left: 3px solid transparent;
}

.mini-planned { background: var(--green-50); border-left-color: var(--green-400); }
.mini-done { background: var(--green-100); border-left-color: var(--green-600); }
.mini-skipped { background: #fef2f2; border-left-color: #f87171; }

.mini-subject { font-weight: 500; }
.mini-time { color: var(--text-muted); font-size: 11px; }

/* ── Timeline Panel ── */
.timeline-panel {
  padding: 0;
  overflow: hidden;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.timeline-date-label {
  font-size: 14px;
  font-weight: 600;
}

.timeline-scroll {
  height: calc(100vh - 220px);
  overflow-y: auto;
  overflow-x: hidden;
}

.timeline-scroll::-webkit-scrollbar { width: 4px; }
.timeline-scroll::-webkit-scrollbar-thumb { background: var(--gray-200); border-radius: 4px; }

.timeline-body {
  position: relative;
  padding-left: 56px;
  padding-right: 16px;
  padding-bottom: 32px;
}

.hour-row {
  position: relative;
  height: 64px;
  display: flex;
  align-items: flex-start;
}

.hour-label {
  position: absolute;
  left: -56px;
  width: 48px;
  text-align: right;
  font-size: 11px;
  color: var(--text-muted);
  top: -7px;
  user-select: none;
}

.hour-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: var(--border);
}

/* Now line */
.now-line {
  position: absolute;
  left: 56px;
  right: 16px;
  display: flex;
  align-items: center;
  z-index: 10;
  pointer-events: none;
}

.now-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--green-500);
  flex-shrink: 0;
  margin-left: -5px;
}

.now-bar {
  flex: 1;
  height: 2px;
  background: var(--green-500);
}

.now-time {
  font-size: 10px;
  color: var(--green-600);
  font-weight: 600;
  margin-left: 6px;
  white-space: nowrap;
}

/* Session blocks */
.tl-block {
  position: absolute;
  left: 56px;
  right: 16px;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: opacity 0.15s, transform 0.1s;
  overflow: hidden;
  z-index: 5;
}

.tl-block:hover {
  opacity: 0.85;
  transform: translateX(2px);
}

.tl-planned {
  background: var(--green-50);
  border-left-color: var(--green-400);
}

.tl-done {
  background: var(--green-100);
  border-left-color: var(--green-600);
}

.tl-skipped {
  background: #fef2f2;
  border-left-color: #f87171;
}

.tl-subject {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tl-topic {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tl-time {
  font-size: 11px;
  color: var(--text-muted);
}

.tl-duration {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 500;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  background: white;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 15px;
  font-weight: 600;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-actions {
  display: flex;
  align-items: center;
  padding-top: 4px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.icon-btn:hover { background: var(--gray-100); }

@media (max-width: 900px) {
  .schedule-layout {
    grid-template-columns: 1fr;
  }

  .cal-panel {
    position: static;
  }

  .timeline-scroll {
    height: 500px;
  }
}
</style>
