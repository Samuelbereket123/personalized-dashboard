<template>
  <div>
    <div class="page-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div>
        <h1>Bible Tracker</h1>
        <p>Track your KJV reading — tick chapters as you finish them</p>
      </div>
      <div class="header-stats">
        <div class="hstat">
          <span class="hstat-val">{{ totalRead }}</span>
          <span class="hstat-label">chapters read</span>
        </div>
        <div class="hstat">
          <span class="hstat-val">{{ totalChapters }}</span>
          <span class="hstat-label">total chapters</span>
        </div>
        <div class="hstat">
          <span class="hstat-val">{{ overallPct }}%</span>
          <span class="hstat-label">complete</span>
        </div>
      </div>
    </div>

    <!-- Overall progress bar -->
    <div class="card" style="padding:16px; margin-bottom:16px;">
      <div class="overall-bar-wrap">
        <div class="overall-bar" :style="{ width: overallPct + '%' }" />
      </div>
      <div class="overall-labels">
        <span>{{ totalRead }} / {{ totalChapters }} chapters</span>
        <span>{{ totalChapters - totalRead }} remaining</span>
      </div>
    </div>

    <!-- Testament tabs -->
    <div class="testament-tabs" style="margin-bottom:16px;">
      <button
        v-for="t in ['All', 'Old Testament', 'New Testament']"
        :key="t"
        :class="['testament-tab', { active: activeTestament === t }]"
        @click="activeTestament = t"
      >{{ t }}</button>
    </div>

    <!-- Search -->
    <div class="search-wrap" style="margin-bottom:16px;">
      <input v-model="search" type="text" placeholder="Search book..." class="search-input" />
    </div>

    <!-- Books grid -->
    <div class="books-grid">
      <div
        v-for="book in filteredBooks"
        :key="book.name"
        class="book-card card"
      >
        <div class="book-header" @click="toggleBook(book.name)">
          <div class="book-info">
            <div class="book-name">{{ book.name }}</div>
            <div class="book-meta">{{ bookRead(book.name) }}/{{ book.chapters }} chapters</div>
          </div>
          <div class="book-right">
            <div class="book-mini-bar-wrap">
              <div class="book-mini-bar" :style="{ width: bookPct(book.name) + '%' }" />
            </div>
            <span class="book-pct">{{ bookPct(book.name) }}%</span>
            <ChevronDown :size="14" :class="['chevron', { 'chevron-open': openBooks.has(book.name) }]" />
          </div>
        </div>

        <!-- Chapters grid -->
        <div v-if="openBooks.has(book.name)" class="chapters-grid">
          <button
            v-for="ch in book.chapters"
            :key="ch"
            :class="['ch-btn', { 'ch-read': isRead(book.name, ch) }]"
            @click="toggleChapter(book.name, ch)"
            :title="`${book.name} ${ch}`"
          >
            {{ ch }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()
const readChapters = ref<Set<string>>(new Set())
const readDates = ref<Record<string, string>>({})
const openBooks = ref<Set<string>>(new Set())
const activeTestament = ref('All')
const search = ref('')

// KJV — all 66 books with chapter counts
const oldTestament = [
  { name: 'Genesis', chapters: 50 },
  { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 },
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 },
  { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 },
  { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 },
  { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
]

const newTestament = [
  { name: 'Matthew', chapters: 28 },
  { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 },
  { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 },
  { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 },
  { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 },
  { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 },
  { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 },
  { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 },
  { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 },
  { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
]

const allBooks = [...oldTestament, ...newTestament]

const filteredBooks = computed(() => {
  let books = allBooks
  if (activeTestament.value === 'Old Testament') books = oldTestament
  if (activeTestament.value === 'New Testament') books = newTestament
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    books = books.filter(b => b.name.toLowerCase().includes(q))
  }
  return books
})

const totalChapters = computed(() => allBooks.reduce((a, b) => a + b.chapters, 0))
const totalRead = computed(() => readChapters.value.size)
const overallPct = computed(() => Math.round((totalRead.value / totalChapters.value) * 100))

function key(book: string, ch: number) { return `${book}::${ch}` }
function isRead(book: string, ch: number) { return readChapters.value.has(key(book, ch)) }

function bookRead(book: string) {
  return [...readChapters.value].filter(k => k.startsWith(book + '::')).length
}

function bookPct(book: string) {
  const b = allBooks.find(x => x.name === book)
  if (!b) return 0
  return Math.round((bookRead(book) / b.chapters) * 100)
}

function toggleBook(name: string) {
  const s = new Set(openBooks.value)
  s.has(name) ? s.delete(name) : s.add(name)
  openBooks.value = s
}

async function toggleChapter(book: string, ch: number) {
  const k = key(book, ch)
  const newSet = new Set(readChapters.value)

  if (newSet.has(k)) {
    newSet.delete(k)
    await (supabase as any).from('bible_progress').delete().eq('book', book).eq('chapter', ch)
  } else {
    newSet.add(k)
    const today = new Date().toISOString().split('T')[0] as string
    readDates.value[k] = today
    await (supabase as any).from('bible_progress').upsert({ book, chapter: ch, read_at: today }, { onConflict: 'book,chapter' })
  }
  readChapters.value = newSet
}

onMounted(async () => {
  const { data } = await (supabase as any).from('bible_progress').select('book, chapter, read_at')
  if (data) {
    const s = new Set<string>()
    ;(data as { book: string; chapter: number; read_at: string }[]).forEach(r => {
      const k = key(r.book, r.chapter)
      s.add(k)
      readDates.value[k] = r.read_at
    })
    readChapters.value = s
  }
})
</script>

<style scoped>
.header-stats {
  display: flex;
  gap: 20px;
}

.hstat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hstat-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--green-700);
  line-height: 1;
}

.hstat-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.overall-bar-wrap {
  height: 10px;
  background: var(--gray-100);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.overall-bar {
  height: 100%;
  background: var(--green-500);
  border-radius: 6px;
  transition: width 0.4s ease;
}

.overall-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.testament-tabs {
  display: flex;
  gap: 6px;
}

.testament-tab {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.testament-tab.active {
  background: var(--green-700);
  color: white;
  border-color: var(--green-700);
}

.search-input {
  max-width: 280px;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.book-card {
  padding: 0;
  overflow: hidden;
}

.book-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.1s;
  gap: 10px;
}

.book-header:hover {
  background: var(--off-white);
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-name {
  font-size: 14px;
  font-weight: 600;
}

.book-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.book-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.book-mini-bar-wrap {
  width: 50px;
  height: 4px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.book-mini-bar {
  height: 100%;
  background: var(--green-500);
  border-radius: 4px;
  transition: width 0.3s;
}

.book-pct {
  font-size: 11px;
  color: var(--text-muted);
  min-width: 28px;
  text-align: right;
}

.chevron {
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron-open {
  transform: rotate(180deg);
}

.chapters-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border);
  background: var(--off-white);
}

.ch-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: white;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ch-btn:hover {
  border-color: var(--green-400);
  color: var(--green-700);
}

.ch-read {
  background: var(--green-600) !important;
  border-color: var(--green-600) !important;
  color: white !important;
}

@media (max-width: 768px) {
  .books-grid {
    grid-template-columns: 1fr;
  }

  .header-stats {
    gap: 12px;
  }
}
</style>
