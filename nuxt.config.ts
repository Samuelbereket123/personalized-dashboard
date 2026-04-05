export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  supabase: {
    redirect: false,
  },
  runtimeConfig: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    reminderEmail: process.env.REMINDER_EMAIL,
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'StudyDesk',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' }
      ]
    }
  }
})
