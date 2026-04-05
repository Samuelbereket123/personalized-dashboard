import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]!

  const [{ data: sessions }, { data: budget }, { data: bible }] = await Promise.all([
    supabase.from('study_sessions').select('id').eq('date', today).limit(1),
    supabase.from('budget_entries').select('id').eq('date', today).limit(1),
    supabase.from('bible_progress').select('id').eq('read_at', today).limit(1),
  ])

  const hasActivity = (sessions?.length ?? 0) > 0 || (budget?.length ?? 0) > 0 || (bible?.length ?? 0) > 0

  if (hasActivity) {
    return { sent: false, reason: 'Activity already logged today' }
  }

  const resend = new Resend(config.resendApiKey as string)
  const appUrl = 'https://personalized-dashboard-hgz6.vercel.app'

  const { error } = await resend.emails.send({
    from: 'StudyDesk <onboarding@resend.dev>',
    to: config.reminderEmail as string,
    subject: "⏰ You haven't logged anything today",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8faf8;">
        <div style="background:#0f1f0f;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;font-size:20px;margin:0 0 6px;">StudyDesk</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Daily Reminder</p>
        </div>
        <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e2e8e2;">
          <h2 style="font-size:18px;color:#0f1f0f;margin:0 0 12px;">Hey, you haven't logged anything today 👀</h2>
          <p style="font-size:14px;color:#4b5e4b;line-height:1.6;margin:0 0 20px;">
            Less than 3 hours left in the day. Take 2 minutes to log your study sessions, expenses, or Bible reading before midnight.
          </p>
          <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;border-left:3px solid #16a34a;margin-bottom:8px;">
            <p style="margin:0;font-size:13px;color:#166534;">📚 Log a study session</p>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;border-left:3px solid #16a34a;margin-bottom:8px;">
            <p style="margin:0;font-size:13px;color:#166534;">💰 Add today's expenses</p>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;border-left:3px solid #16a34a;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#166534;">📖 Tick your Bible chapters</p>
          </div>
          <div style="text-align:center;">
            <a href="${appUrl}" style="background:#15803d;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
              Open StudyDesk →
            </a>
          </div>
        </div>
        <p style="text-align:center;font-size:11px;color:#9ca89c;margin-top:16px;">
          ${today} · StudyDesk daily reminder
        </p>
      </div>
    `,
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { sent: true, to: config.reminderEmail }
})
