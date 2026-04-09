<template>
  <div>
    <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div>
        <h1>Journal</h1>
        <p>Your personal study log</p>
      </div>
      <button class="btn btn-primary" @click="openNew">
        <Plus :size="16" /> New Entry
      </button>
    </div>

    <div class="journal-layout">
      <!-- LEFT: Entry list -->
      <div class="entries-col">
        <!-- Search -->
        <div style="margin-bottom:12px;">
          <input v-model="search" type="text" placeholder="Search entries..." />
        </div>

        <div v-if="filteredEntries.length === 0" class="empty-state card">
          <NotebookPen :size="32" />
          <p>No entries yet. Write your first one.</p>
        </div>

        <div v-else class="entry-list">
          <div
            v-for="entry in filteredEntries"
            :key="entry.id"
            :class="['entry-item card', { 'entry-active': selectedEntry?.id === entry.id }]"
            @click="selectEntry(entry)"
          >
            <div class="entry-item-top">
              <span class="entry-date">{{ formatDate(entry.date) }}</span>
            </div>
            <div class="entry-title">{{ entry.title || 'Untitled' }}</div>
            <div class="entry-preview">{{ preview(entry.body) }}</div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Editor / Viewer -->
      <div class="editor-col card" style="padding:0; overflow:hidden;">
        <!-- Empty state -->
        <div v-if="!selectedEntry && !isWriting" class="editor-empty">
          <NotebookPen :size="40" style="opacity:0.15; margin-bottom:12px;" />
          <p>Select an entry or write a new one</p>
        </div>

        <!-- Editor -->
        <div v-else-if="isWriting" class="editor-wrap">
          <div class="editor-toolbar">
            <input
              v-model="form.title"
              type="text"
              placeholder="Entry title (optional)"
              class="title-input"
            />
            <div class="toolbar-right">
              <input v-model="form.date" type="date" style="width:auto;" />
            </div>
          </div>
          <textarea
            v-model="form.body"
            class="editor-textarea"
            placeholder="Write about your day, what you studied, how you felt, what you want to improve..."
            autofocus
          />
          <div class="editor-footer">
            <span class="word-count">{{ wordCount }} words</span>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-ghost" @click="cancelEdit">Cancel</button>
              <button class="btn btn-primary" @click="saveEntry" :disabled="saving || !form.body.trim()">
                {{ saving ? 'Saving...' : editingEntry ? 'Update' : 'Save Entry' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Viewer -->
        <div v-else-if="selectedEntry" class="viewer-wrap">
          <div class="viewer-header">
            <div>
              <div class="viewer-title">{{ selectedEntry.title || 'Untitled' }}</div>
              <div class="viewer-meta">
                <span>{{ formatDate(selectedEntry.date) }}</span>
                <span class="word-count">{{ countWords(selectedEntry.body) }} words</span>
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-ghost" @click="editEntry(selectedEntry)">Edit</button>
              <button class="btn btn-danger" @click="showClear = true">Delete</button>
            </div>
          </div>
          <div class="viewer-body">{{ selectedEntry.body }}</div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="showClear"
      title="Delete this entry?"
      message="This journal entry will be permanently deleted."
      @confirm="deleteEntry"
    />
  </div>
</template>

<script setup lang="ts">
import { Plus, NotebookPen } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()
const entries = ref<any[]>([])
const selectedEntry = ref<any>(null)
const isWriting = ref(false)
const saving = ref(false)
const showClear = ref(false)
const search = ref('')
const editingEntry = ref<any>(null)

const defaultForm = () => ({
  title: '',
  body: '',
  date: new Date().toISOString().split('T')[0] as string,
})

const form = ref(defaultForm())

const filteredEntries = computed(() => {
  if (!search.value.trim()) return entries.value
  const q = search.value.toLowerCase()
  return entries.value.filter(e =>
    (e.title || '').toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
  )
})

const wordCount = computed(() => countWords(form.value.body))

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function preview(body: string) {
  return body.length > 100 ? body.slice(0, 100) + '...' : body
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function openNew() {
  editingEntry.value = null
  form.value = defaultForm()
  selectedEntry.value = null
  isWriting.value = true
}

function editEntry(entry: any) {
  editingEntry.value = entry
  form.value = { title: entry.title || '', body: entry.body, date: entry.date }
  isWriting.value = true
}

function selectEntry(entry: any) {
  selectedEntry.value = entry
  isWriting.value = false
  editingEntry.value = null
}

function cancelEdit() {
  isWriting.value = false
  editingEntry.value = null
  form.value = defaultForm()
}

async function saveEntry() {
  if (!form.value.body.trim()) return
  saving.value = true

  if (editingEntry.value) {
    const { data, error } = await (supabase as any)
      .from('journal_entries')
      .update({ ...form.value, updated_at: new Date().toISOString() })
      .eq('id', editingEntry.value.id)
      .select()
      .single()
    if (!error && data) {
      const idx = entries.value.findIndex(e => e.id === editingEntry.value.id)
      if (idx !== -1) entries.value[idx] = data
      selectedEntry.value = data
    }
  } else {
    const { data, error } = await (supabase as any)
      .from('journal_entries')
      .insert(form.value)
      .select()
      .single()
    if (!error && data) {
      entries.value.unshift(data)
      selectedEntry.value = data
    }
  }

  saving.value = false
  isWriting.value = false
  editingEntry.value = null
}

async function deleteEntry() {
  if (!selectedEntry.value) return
  await (supabase as any).from('journal_entries').delete().eq('id', selectedEntry.value.id)
  entries.value = entries.value.filter(e => e.id !== selectedEntry.value.id)
  selectedEntry.value = null
}

onMounted(async () => {
  const { data } = await (supabase as any)
    .from('journal_entries')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  entries.value = data || []
})
</script>

<style scoped>
.journal-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  align-items: start;
}

.entries-col {
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 2px;
}

.entry-list::-webkit-scrollbar { width: 4px; }
.entry-list::-webkit-scrollbar-thumb { background: var(--gray-200); border-radius: 4px; }

.entry-item {
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.1s;
  border: 1px solid var(--border);
}

.entry-item:hover {
  border-color: var(--green-300);
}

.entry-active {
  border-color: var(--green-500) !important;
  background: var(--green-50) !important;
}

.entry-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.entry-date {
  font-size: 11px;
  color: var(--text-muted);
}

.entry-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-preview {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Editor */
.editor-col {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

.editor-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
  padding: 60px 20px;
}

.editor-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
  flex-wrap: wrap;
}

.title-input {
  flex: 1;
  border: none !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  padding: 0 !important;
  background: transparent !important;
  min-width: 0;
}

.title-input:focus {
  outline: none;
  border: none !important;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mood-select {
  width: auto;
  padding: 5px 8px;
  font-size: 13px;
}

.editor-textarea {
  flex: 1;
  border: none !important;
  border-radius: 0 !important;
  resize: none;
  padding: 20px !important;
  font-size: 15px !important;
  line-height: 1.7 !important;
  min-height: 400px;
  background: white;
  color: var(--text-primary);
}

.editor-textarea:focus {
  outline: none;
  border: none !important;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--off-white);
}

.word-count {
  font-size: 12px;
  color: var(--text-muted);
}

/* Viewer */
.viewer-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.viewer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.viewer-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
}

.viewer-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.viewer-body {
  flex: 1;
  padding: 24px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .journal-layout {
    grid-template-columns: 1fr;
  }

  .entries-col {
    position: static;
  }

  .entry-list {
    max-height: 300px;
  }
}
</style>
