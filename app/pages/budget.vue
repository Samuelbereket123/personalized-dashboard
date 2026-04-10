<template>
  <div>
    <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div>
        <h1>Budget Tracker</h1>
        <p>Weekly spending breakdown</p>
      </div>
      <button class="btn btn-primary" @click="openAdd">
        <Plus :size="16" /> Add Expense
      </button>
      <button class="btn btn-ghost" style="color:#dc2626; border-color:#fecaca;" @click="showClear = true">
        <Trash2 :size="15" /> Clear All
      </button>
    </div>

    <ConfirmDialog
      v-model="showClear"
      title="Clear all expenses?"
      message="This will permanently delete every budget entry this week. This cannot be undone."
      @confirm="clearAll"
    />

    <!-- Week nav -->
    <div class="week-nav card" style="margin-bottom:16px;">
      <button class="btn btn-ghost" @click="prevWeek"><ChevronLeft :size="16" /></button>
      <span class="week-label">{{ weekLabel }}</span>
      <button class="btn btn-ghost" @click="nextWeek"><ChevronRight :size="16" /></button>
    </div>

    <div class="budget-layout">
      <!-- LEFT: Summary panel -->
      <div class="summary-col">

        <!-- Total spend card -->
        <div class="total-hero card">
          <div class="total-hero-label">Total Spent</div>
          <div class="total-hero-value">{{ weekTotal }} ETB</div>
          <div class="total-hero-sub">{{ weekEntries.length }} expense{{ weekEntries.length !== 1 ? 's' : '' }} this week</div>
          <div class="total-progress-wrap">
            <div class="total-progress-bar" :style="{ width: overallPct + '%', background: overallPct > 90 ? '#f87171' : 'rgba(255,255,255,0.7)' }" />
          </div>
          <div class="total-hero-limit" v-if="totalLimit > 0">{{ weekTotal }} ETB / {{ totalLimit }} ETB limit</div>
        </div>

        <!-- Category breakdown -->
        <div class="card" style="padding:16px;">
          <div class="section-label">By Category</div>
          <div class="cat-breakdown">
            <div v-for="cat in categories" :key="cat.key" class="cat-row" @click="activeFilter = activeFilter === cat.key ? 'all' : cat.key" :class="{ 'cat-active': activeFilter === cat.key }">
              <div class="cat-row-left">
                <div class="cat-icon-sm" :style="{ background: cat.bg, color: cat.color }">
                  <component :is="cat.icon" :size="14" />
                </div>
                <div>
                  <div class="cat-row-name">{{ cat.label }}</div>
                  <div class="cat-row-count">{{ catCount(cat.key) }} items</div>
                </div>
              </div>
              <div class="cat-row-right">
                <div class="cat-row-amount">{{ catTotal(cat.key) }} ETB</div>
                <div class="cat-row-pct">{{ catPct(cat.key) }}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Daily spending chart -->
        <div class="card" style="padding:16px;">
          <div class="section-label">Daily Spending</div>
          <div class="daily-chart">
            <div v-for="day in dailyData" :key="day.date" class="daily-bar-col">
              <div class="daily-bar-wrap">
                <div
                  class="daily-bar"
                  :style="{ height: day.pct + '%' }"
                  :title="`${day.total} ETB`"
                />
              </div>
              <div class="daily-label">{{ day.label }}</div>
              <div class="daily-amount">{{ day.total > 0 ? day.total : '' }} {{ day.total > 0 ? 'ETB' : '' }}</div>
            </div>
          </div>
        </div>

        <!-- Budget limits -->
        <div class="card" style="padding:16px;">
          <div class="section-label" style="margin-bottom:12px;">Weekly Limits</div>
          <div class="limits-list">
            <div v-for="cat in categories" :key="cat.key" class="limit-row">
              <div class="limit-cat-info">
                <div class="cat-icon-sm" :style="{ background: cat.bg, color: cat.color }">
                  <component :is="cat.icon" :size="13" />
                </div>
                <span class="limit-cat-name">{{ cat.label }}</span>
              </div>
              <div class="limit-input-wrap">
                <span class="limit-etb">ETB</span>
                <input
                  type="number"
                  class="limit-input"
                  :value="limits[cat.key] || ''"
                  @change="setLimit(cat.key, ($event.target as HTMLInputElement).value)"
                  placeholder="No limit"
                  min="0"
                />
              </div>
              <div v-if="limits[cat.key]" class="limit-status" :class="limitStatus(cat.key)">
                {{ catPctOfLimit(cat.key) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Expense log -->
      <div class="log-col card" style="padding:0; overflow:hidden;">
        <div class="log-header">
          <span class="log-title">Expenses</span>
          <div class="filter-tabs">
            <button
              v-for="f in ['all', ...categories.map(c => c.key)]"
              :key="f"
              :class="['filter-tab', { active: activeFilter === f }]"
              @click="activeFilter = f"
            >{{ f === 'all' ? 'All' : categories.find(c => c.key === f)?.label }}</button>
          </div>
        </div>

        <div class="log-scroll">
          <div v-if="filteredEntries.length === 0" class="empty-state">
            <Wallet :size="32" />
            <p>No expenses {{ activeFilter !== 'all' ? 'in this category' : 'this week' }}</p>
          </div>

          <!-- Group by date -->
          <div v-for="group in groupedEntries" :key="group.date" class="entry-group">
            <div class="group-date-header">
              <span>{{ group.label }}</span>
              <span class="group-total">{{ group.total }} ETB</span>
            </div>
            <div
              v-for="entry in group.entries"
              :key="entry.id"
              class="entry-row"
              @click="openEdit(entry)"
            >
              <div class="entry-cat-icon" :style="{ background: getCat(entry.category)?.bg, color: getCat(entry.category)?.color }">
                <component :is="getCat(entry.category)?.icon" :size="14" />
              </div>
              <div class="entry-info">
                <div class="entry-desc">{{ entry.description || getCat(entry.category)?.label }}</div>
                <span class="entry-tag" :style="{ background: getCat(entry.category)?.bg, color: getCat(entry.category)?.color }">
                  {{ getCat(entry.category)?.label }}
                </span>
              </div>
              <div class="entry-amount">{{ Number(entry.amount).toFixed(2) }} ETB</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <div class="modal-header">
          <span>{{ editingEntry ? 'Edit Expense' : 'Add Expense' }}</span>
          <button class="icon-btn" @click="closeForm"><X :size="18" /></button>
        </div>
        <form @submit.prevent="saveEntry" class="modal-body">
          <div class="grid-2">
            <div class="form-group">
              <label>Category *</label>
              <select v-model="form.category" required>
                <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Amount (ETB) *</label>
              <input v-model="form.amount" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Date *</label>
              <input v-model="form.date" type="date" required />
            </div>
            <div class="form-group">
              <label>Description</label>
              <input v-model="form.description" type="text" placeholder="e.g. Jeepney fare" />
            </div>
          </div>
          <div class="modal-actions">
            <button v-if="editingEntry" type="button" class="btn btn-danger" @click="deleteEntry(editingEntry.id)">Delete</button>
            <div style="display:flex; gap:8px; margin-left:auto;">
              <button type="button" class="btn btn-ghost" @click="closeForm">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Saving...' : editingEntry ? 'Update' : 'Add' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, ChevronLeft, ChevronRight, Wallet, X, Bus, UtensilsCrossed, BookOpen, MoreHorizontal, Trash2 } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const entries = ref<any[]>([])
const showForm = ref(false)
const showClear = ref(false)
const saving = ref(false)
const activeFilter = ref('all')
const currentWeekOffset = ref(0)
const editingEntry = ref<any>(null)

// Persisted limits in localStorage
const limits = ref<Record<string, number>>({})

const categories = [
  { key: 'transportation', label: 'Transport', icon: Bus, color: '#166534', bg: '#dcfce7' },
  { key: 'food', label: 'Food', icon: UtensilsCrossed, color: '#065f46', bg: '#d1fae5' },
  { key: 'supplies', label: 'Supplies', icon: BookOpen, color: '#14532d', bg: '#bbf7d0' },
  { key: 'other', label: 'Other', icon: MoreHorizontal, color: '#4b5e4b', bg: '#f0fdf4' },
]

const defaultForm = () => ({
  category: 'food',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
})

const form = ref(defaultForm())

// Week helpers
const weekStart = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + currentWeekOffset.value * 7)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
})

const weekEnd = computed(() => {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
})

const weekLabel = computed(() => {
  const s = new Date(weekStart.value + 'T00:00:00')
  const e = new Date(weekEnd.value + 'T00:00:00')
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
})

const weekEntries = computed(() =>
  entries.value
    .filter(e => e.date >= weekStart.value && e.date <= weekEnd.value)
    .sort((a, b) => b.date.localeCompare(a.date))
)

const filteredEntries = computed(() =>
  activeFilter.value === 'all' ? weekEntries.value : weekEntries.value.filter(e => e.category === activeFilter.value)
)

// Group entries by date for the log
const groupedEntries = computed(() => {
  const map: Record<string, any[]> = {}
  filteredEntries.value.forEach(e => {
    if (!map[e.date]) map[e.date] = []
    map[e.date].push(e)
  })
  return Object.entries(map).map(([date, ents]) => ({
    date,
    label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    entries: ents,
    total: ents.reduce((a, b) => a + Number(b.amount), 0).toFixed(2),
  }))
})

const weekTotal = computed(() =>
  weekEntries.value.reduce((a, b) => a + Number(b.amount), 0).toFixed(2)
)

const totalLimit = computed(() => Object.values(limits.value).reduce((a, b) => a + b, 0))

const overallPct = computed(() => {
  if (!totalLimit.value) return 0
  return Math.min(Math.round((Number(weekTotal.value) / totalLimit.value) * 100), 100)
})

function catTotal(key: string) {
  return weekEntries.value.filter(e => e.category === key).reduce((a, b) => a + Number(b.amount), 0).toFixed(2)
}

function catCount(key: string) {
  return weekEntries.value.filter(e => e.category === key).length
}

function catPct(key: string) {
  const total = Number(weekTotal.value)
  if (!total) return 0
  return Math.round((Number(catTotal(key)) / total) * 100)
}

function catPctOfLimit(key: string) {
  const lim = limits.value[key]
  if (!lim) return 0
  return Math.min(Math.round((Number(catTotal(key)) / lim) * 100), 100)
}

function limitStatus(key: string) {
  const pct = catPctOfLimit(key)
  if (pct >= 100) return 'limit-over'
  if (pct >= 80) return 'limit-warn'
  return 'limit-ok'
}

function getCat(key: string) {
  return categories.find(c => c.key === key)
}

function setLimit(key: string, val: string) {
  const n = parseFloat(val)
  if (!isNaN(n) && n > 0) limits.value[key] = n
  else delete limits.value[key]
  localStorage.setItem('budget_limits', JSON.stringify(limits.value))
}

// Daily chart data
const dailyData = computed(() => {
  const days = []
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  let maxTotal = 0
  const totals: number[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.value + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const total = weekEntries.value
      .filter(e => e.date === dateStr)
      .reduce((a, b) => a + Number(b.amount), 0)
    totals.push(total)
    if (total > maxTotal) maxTotal = total
    days.push({ date: dateStr, label: dayNames[i], total: total > 0 ? total.toFixed(0) : 0 })
  }

  return days.map((d, i) => ({
    ...d,
    pct: maxTotal > 0 ? Math.round((totals[i] / maxTotal) * 100) : 0,
  }))
})

function prevWeek() { currentWeekOffset.value-- }
function nextWeek() { currentWeekOffset.value++ }

function openAdd() {
  editingEntry.value = null
  form.value = defaultForm()
  showForm.value = true
}

function openEdit(entry: any) {
  editingEntry.value = entry
  form.value = { ...entry }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingEntry.value = null
}

async function saveEntry() {
  saving.value = true
  if (editingEntry.value) {
    const { error } = await supabase.from('budget_entries').update(form.value).eq('id', editingEntry.value.id)
    if (!error) {
      const idx = entries.value.findIndex(e => e.id === editingEntry.value.id)
      if (idx !== -1) entries.value[idx] = { ...editingEntry.value, ...form.value }
    }
  } else {
    const { data, error } = await supabase.from('budget_entries').insert({ ...form.value, user_id: user.value?.id }).select().single()
    if (error) console.error('Budget insert error:', error)
    if (!error && data) entries.value.push(data)
  }
  saving.value = false
  closeForm()
}

async function deleteEntry(id: string) {
  await supabase.from('budget_entries').delete().eq('id', id)
  entries.value = entries.value.filter(e => e.id !== id)
  closeForm()
}

async function clearAll() {
  await supabase.from('budget_entries').delete().gte('date', weekStart.value).lte('date', weekEnd.value)
  entries.value = entries.value.filter(e => e.date < weekStart.value || e.date > weekEnd.value)
}

onMounted(async () => {
  const { data } = await supabase.from('budget_entries').select('*').order('date', { ascending: false })
  entries.value = data || []

  const saved = localStorage.getItem('budget_limits')
  if (saved) limits.value = JSON.parse(saved)

  // Realtime
  supabase.channel('budget_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_entries' }, async () => {
      const { data } = await supabase.from('budget_entries').select('*').order('date', { ascending: false })
      entries.value = data || []
    })
    .subscribe()
})
</script>

<style scoped>
.budget-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  align-items: start;
}

/* ── Left summary ── */
.summary-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: 0;
}

.total-hero {
  background: var(--dark-green-2);
  color: white;
  border-color: transparent;
  padding: 20px;
}

.total-hero-label {
  font-size: 12px;
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-hero-value {
  font-size: 36px;
  font-weight: 700;
  margin: 4px 0 2px;
  line-height: 1;
}

.total-hero-sub {
  font-size: 12px;
  opacity: 0.5;
  margin-bottom: 14px;
}

.total-progress-wrap {
  height: 4px;
  background: rgba(255,255,255,0.15);
  border-radius: 4px;
  overflow: hidden;
}

.total-progress-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.total-hero-limit {
  font-size: 11px;
  opacity: 0.5;
  margin-top: 6px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.cat-breakdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}

.cat-row:hover, .cat-active {
  background: var(--off-white);
}

.cat-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cat-icon-sm {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cat-row-name {
  font-size: 13px;
  font-weight: 500;
}

.cat-row-count {
  font-size: 11px;
  color: var(--text-muted);
}

.cat-row-right {
  text-align: right;
}

.cat-row-amount {
  font-size: 14px;
  font-weight: 600;
}

.cat-row-pct {
  font-size: 11px;
  color: var(--text-muted);
}

/* Daily chart */
.daily-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 90px;
  padding-top: 8px;
}

.daily-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.daily-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.daily-bar {
  width: 100%;
  background: var(--green-400);
  border-radius: 4px;
  transition: height 0.4s ease;
  min-height: 0;
}

.daily-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 500;
}

.daily-amount {
  font-size: 9px;
  color: var(--green-600);
  font-weight: 600;
  min-height: 12px;
}

/* Limits */
.limits-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.limit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.limit-cat-info {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 90px;
}

.limit-cat-name {
  font-size: 12px;
  font-weight: 500;
}

.limit-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
  background: white;
}

.limit-etb {
  padding: 0 6px;
  font-size: 12px;
  color: var(--text-muted);
  border-right: 1px solid var(--border);
  background: var(--off-white);
  height: 100%;
  display: flex;
  align-items: center;
}

.limit-input {
  border: none !important;
  border-radius: 0 !important;
  padding: 6px 8px !important;
  font-size: 12px !important;
  width: 100%;
}

.limit-input:focus {
  outline: none;
  border: none !important;
}

.limit-status {
  font-size: 11px;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

.limit-ok { color: var(--green-600); }
.limit-warn { color: #d97706; }
.limit-over { color: #dc2626; }

/* ── Right log ── */
.log-col {
  min-height: 500px;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 8px;
}

.log-title {
  font-size: 14px;
  font-weight: 600;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.15s;
  cursor: pointer;
}

.filter-tab.active {
  background: var(--green-700);
  color: white;
  border-color: var(--green-700);
}

.log-scroll {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  padding: 8px 0;
}

.log-scroll::-webkit-scrollbar { width: 4px; }
.log-scroll::-webkit-scrollbar-thumb { background: var(--gray-200); border-radius: 4px; }

.entry-group {
  margin-bottom: 4px;
}

.group-date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.group-total {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.1s;
}

.entry-row:hover {
  background: var(--off-white);
}

.entry-cat-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.entry-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entry-desc {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-tag {
  display: inline-flex;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  width: fit-content;
}

.entry-amount {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

/* Week nav */
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
  max-width: 480px;
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
  .budget-layout {
    grid-template-columns: 1fr;
  }

  .summary-col {
    position: static;
  }

  .log-scroll {
    max-height: 500px;
  }
}
</style>


