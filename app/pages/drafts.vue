<template>
  <div>
    <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div>
        <h1>Substack Drafts</h1>
        <p>Write raw, refine, publish</p>
      </div>
      <button class="btn btn-primary" @click="createDraft">
        <Plus :size="16" /> New Draft
      </button>
    </div>

    <div class="drafts-layout">
      <!-- LEFT: Draft list -->
      <div class="drafts-col">
        <div v-if="drafts.length === 0" class="empty-state card">
          <FileText :size="32" />
          <p>No drafts yet. Start writing.</p>
        </div>
        <div v-else class="draft-list">
          <div
            v-for="draft in drafts"
            :key="draft.id"
            :class="['draft-item card', { 'draft-active': selectedDraft?.id === draft.id }]"
            @click="selectDraft(draft)"
          >
            <div class="draft-item-top">
              <span :class="['status-dot', `status-${draft.status}`]" />
              <span class="draft-status">{{ draft.status }}</span>
              <Lock v-if="draft.pin" :size="11" style="color:var(--text-muted); margin-left:auto;" />
              <span v-else class="draft-date">{{ formatDate(draft.updated_at) }}</span>
            </div>
            <div class="draft-title">{{ draft.title || 'Untitled Draft' }}</div>
            <div class="draft-preview">{{ preview(draft.raw) }}</div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Editor -->
      <div v-if="!selectedDraft" class="editor-empty card">
        <FileText :size="40" style="opacity:0.15; margin-bottom:12px;" />
        <p>Select a draft or create a new one</p>
      </div>

      <div v-else class="editor-panel card" style="padding:0; overflow:hidden;">
        <!-- Title + meta bar -->
        <div class="editor-topbar">
          <input
            v-model="selectedDraft.title"
            type="text"
            placeholder="Article title..."
            class="title-input"
            @input="debounceSave"
          />
          <div class="topbar-actions">
            <select v-model="selectedDraft.status" class="status-select" @change="debounceSave">
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="published">Published</option>
            </select>
            <button v-if="selectedDraft.pin" class="btn btn-ghost" style="padding:6px 10px;" @click="removePin(selectedDraft)" title="Remove PIN">
              <Unlock :size="14" />
            </button>
            <button v-else class="btn btn-ghost" style="padding:6px 10px;" @click="openSetPin(selectedDraft)" title="Lock draft">
              <Lock :size="14" />
            </button>
            <button class="btn btn-danger" style="padding:6px 10px;" @click="showDelete = true">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- Split editor -->
        <div class="split-editor">
          <!-- Raw side -->
          <div class="editor-side">
            <div class="side-label">
              <PenLine :size="13" />
              Raw — write freely here
            </div>
            <textarea
              v-model="selectedDraft.raw"
              class="editor-area"
              placeholder="Just write. Don't think about formatting or polish. Get your ideas out..."
              @input="debounceSave"
            />
            <div class="side-footer">{{ countWords(selectedDraft.raw) }} words</div>
          </div>

          <div class="split-divider" />

          <!-- Enhanced side -->
          <div class="editor-side">
            <div class="side-label enhanced-label">
              <Sparkles :size="13" />
              Enhanced — polished version
            </div>
            <textarea
              v-model="selectedDraft.enhanced"
              class="editor-area"
              placeholder="Paste your enhanced/edited version here. This is what goes to Substack..."
              @input="debounceSave"
            />
            <div class="side-footer">{{ countWords(selectedDraft.enhanced) }} words</div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="showDelete"
      title="Delete this draft?"
      message="This draft will be permanently deleted."
      @confirm="deleteDraft"
    />

    <PinDialog
      v-model="showPinDialog"
      :is-set="true"
      :correct-pin="pinDialogDraft?.pin"
      @unlocked="onUnlocked"
    />

    <PinDialog
      v-model="showSetPin"
      :is-set="false"
      @pin-set="onPinSet"
    />
  </div>
</template>

<script setup lang="ts">
import { Plus, FileText, Trash2, PenLine, Sparkles, Lock, Unlock } from 'lucide-vue-next'
import { useSupabaseClient, useSupabaseUser } from '#imports'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const drafts = ref<any[]>([])
const selectedDraft = ref<any>(null)
const showDelete = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

// PIN state
const showPinDialog = ref(false)
const pinDialogDraft = ref<any>(null)
const unlockedIds = ref<Set<string>>(new Set())
const showSetPin = ref(false)
const pinTargetDraft = ref<any>(null)

function preview(text: string) {
  if (!text) return 'No content yet...'
  return text.length > 90 ? text.slice(0, 90) + '...' : text
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function countWords(text: string) {
  return text?.trim() ? text.trim().split(/\s+/).length : 0
}

function selectDraft(draft: any) {
  if (draft.pin && !unlockedIds.value.has(draft.id)) {
    pinDialogDraft.value = draft
    showPinDialog.value = true
    return
  }
  selectedDraft.value = { ...draft }
}

function onUnlocked() {
  if (!pinDialogDraft.value) return
  unlockedIds.value = new Set([...unlockedIds.value, pinDialogDraft.value.id])
  selectedDraft.value = { ...pinDialogDraft.value }
  pinDialogDraft.value = null
}

function openSetPin(draft: any) {
  pinTargetDraft.value = draft
  showSetPin.value = true
}

async function onPinSet(pin: string) {
  if (!pinTargetDraft.value) return
  await (supabase as any).from('substack_drafts').update({ pin }).eq('id', pinTargetDraft.value.id)
  const idx = drafts.value.findIndex(d => d.id === pinTargetDraft.value.id)
  if (idx !== -1) drafts.value[idx].pin = pin
  if (selectedDraft.value?.id === pinTargetDraft.value.id) selectedDraft.value.pin = pin
  pinTargetDraft.value = null
}

async function removePin(draft: any) {
  await (supabase as any).from('substack_drafts').update({ pin: null }).eq('id', draft.id)
  const idx = drafts.value.findIndex(d => d.id === draft.id)
  if (idx !== -1) drafts.value[idx].pin = null
  if (selectedDraft.value?.id === draft.id) selectedDraft.value.pin = null
}

async function createDraft() {
  const uid = user.value?.id
  console.log('uid:', uid)
  const { data, error } = await (supabase as any)
    .from('substack_drafts')
    .insert({ title: 'Untitled Draft', raw: '', enhanced: '', status: 'draft', user_id: uid })
    .select()
    .single()
  if (error) console.error('Draft insert error:', error)
  if (!error && data) {
    drafts.value.unshift(data)
    selectedDraft.value = { ...data }
  }
}

function debounceSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveDraft(), 800)
}

async function saveDraft() {
  if (!selectedDraft.value) return
  const { data, error } = await (supabase as any)
    .from('substack_drafts')
    .update({
      title: selectedDraft.value.title,
      raw: selectedDraft.value.raw,
      enhanced: selectedDraft.value.enhanced,
      status: selectedDraft.value.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', selectedDraft.value.id)
    .select()
    .single()
  if (!error && data) {
    const idx = drafts.value.findIndex(d => d.id === data.id)
    if (idx !== -1) drafts.value[idx] = data
  }
}

async function deleteDraft() {
  if (!selectedDraft.value) return
  await (supabase as any).from('substack_drafts').delete().eq('id', selectedDraft.value.id)
  drafts.value = drafts.value.filter(d => d.id !== selectedDraft.value.id)
  selectedDraft.value = null
}

onMounted(async () => {
  const { data } = await (supabase as any)
    .from('substack_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
  drafts.value = data || []
})
</script>

<style scoped>
.drafts-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  align-items: start;
}

.drafts-col {
  position: sticky;
  top: 0;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: 2px;
}

.draft-list::-webkit-scrollbar { width: 4px; }
.draft-list::-webkit-scrollbar-thumb { background: var(--gray-200); border-radius: 4px; }

.draft-item {
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.1s;
}

.draft-item:hover { border-color: var(--green-400); }

.draft-active {
  border-color: var(--green-500) !important;
  background: var(--green-50) !important;
}

.draft-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-draft { background: var(--text-muted); }
.status-ready { background: var(--green-500); }
.status-published { background: #3b82f6; }

.draft-status {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: capitalize;
  flex: 1;
}

.draft-date {
  font-size: 11px;
  color: var(--text-muted);
}

.draft-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.draft-preview {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.editor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 180px);
  color: var(--text-muted);
  font-size: 14px;
}

.editor-panel {
  min-height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
}

.editor-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.title-input {
  flex: 1;
  border: none !important;
  font-size: 17px !important;
  font-weight: 700 !important;
  padding: 0 !important;
  background: transparent !important;
  color: var(--text-primary) !important;
  min-width: 0;
}

.title-input:focus {
  outline: none;
  border: none !important;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-select {
  width: auto;
  padding: 5px 8px;
  font-size: 12px;
}

.split-editor {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  flex: 1;
  min-height: 0;
}

.editor-side {
  display: flex;
  flex-direction: column;
}

.side-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.enhanced-label {
  color: var(--green-600);
}

.editor-area {
  flex: 1;
  border: none !important;
  border-radius: 0 !important;
  resize: none;
  padding: 18px !important;
  font-size: 14px !important;
  line-height: 1.75 !important;
  min-height: 500px;
  background: var(--white) !important;
  color: var(--text-primary) !important;
}

.editor-area:focus {
  outline: none;
  border: none !important;
}

.side-footer {
  padding: 8px 16px;
  font-size: 11px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  background: var(--off-white);
}

.split-divider {
  background: var(--border);
  width: 1px;
}

@media (max-width: 900px) {
  .drafts-layout {
    grid-template-columns: 1fr;
  }

  .drafts-col {
    position: static;
  }

  .split-editor {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1px 1fr;
  }

  .split-divider {
    width: 100%;
    height: 1px;
  }
}
</style>
