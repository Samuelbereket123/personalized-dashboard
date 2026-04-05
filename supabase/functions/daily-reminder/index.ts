// Supabase Edge Function — runs via cron at 21:00 every day
// Schedule this in Supabase dashboard: 0 21 * * *

Deno.serve(async () => {
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:3000'

    const res = await fetch(`${appUrl}/api/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
    })
})
