<template>
  <div class="app-shell">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <aside :class="['sidebar', { 'sidebar-open': sidebarOpen }]">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <BookOpen :size="18" />
        </div>
        <span>StudyDesk</span>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          active-class="nav-item-active"
          @click="sidebarOpen = false"
        >
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <!-- Dark mode toggle -->
        <button class="dark-toggle" @click="toggleDark">
          <component :is="isDark ? Sun : Moon" :size="15" />
          <span>{{ isDark ? 'Light mode' : 'Dark mode' }}</span>
        </button>
        <div class="user-chip">
          <div class="user-avatar">{{ userInitial }}</div>
          <span class="user-name">{{ userName }}</span>
          <button class="logout-btn" @click="logout" title="Sign out">
            <LogOut :size="14" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="main-wrapper">
      <header class="topbar">
        <button class="menu-btn" @click="sidebarOpen = !sidebarOpen">
          <Menu :size="20" />
        </button>
        <div class="topbar-right">
          <span class="date-chip">{{ today }}</span>
        </div>
      </header>

      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, LayoutDashboard, CalendarDays, BarChart2, Wallet, Menu, BookMarked, NotebookPen, Moon, Sun, LogOut } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const sidebarOpen = ref(false)
const isDark = ref(false)

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/analysis', label: 'Weekly Analysis', icon: BarChart2 },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/bible', label: 'Bible Tracker', icon: BookMarked },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
]

const today = computed(() => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
})

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

async function logout() {
  await supabase.auth.signOut()
  navigateTo('/login')
}

const userInitial = computed(() => {
  const name = user.value?.user_metadata?.full_name || user.value?.email || 'S'
  return name.charAt(0).toUpperCase()
})

const userName = computed(() => {
  return user.value?.user_metadata?.full_name || user.value?.email?.split('@')[0] || 'Student'
})

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 40;
  display: none;
}

.sidebar {
  width: var(--sidebar-width);
  background: var(--dark-green-2);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 50;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: var(--green-600);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}

.nav-item:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.85);
}

.nav-item-active {
  background: var(--green-700) !important;
  color: white !important;
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dark-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  font-size: 13px;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  transition: all 0.15s;
}

.dark-toggle:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.85);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  color: rgba(255,255,255,0.6);
  font-size: 13px;
}

.user-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.15s;
}

.logout-btn:hover {
  color: rgba(255,255,255,0.8);
}

.user-avatar {
  width: 28px;
  height: 28px;
  background: var(--green-700);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  height: 56px;
  background: var(--white);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 6px;
}

.menu-btn:hover {
  background: var(--gray-100);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-chip {
  font-size: 13px;
  color: var(--text-muted);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    transition: left 0.25s ease;
  }

  .sidebar-open {
    left: 0;
  }

  .overlay {
    display: block;
  }

  .menu-btn {
    display: flex;
  }

  .main-content {
    padding: 16px;
  }
}
</style>
