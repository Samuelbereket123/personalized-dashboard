export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const body = await readBody(event)

    const { sessions, budget, weekStart, weekEnd } = body

    if (!config.deepseekApiKey) {
        throw createError({ statusCode: 500, statusMessage: 'DEEPSEEK_API_KEY is not set in .env' })
    }

    const prompt = `You are a study coach AI. Analyze this student's week (${weekStart} to ${weekEnd}) and give honest, actionable feedback.

STUDY SESSIONS:
${sessions.length === 0 ? 'No sessions logged.' : sessions.map((s: any) =>
        `- ${s.subject}${s.topic ? ` (${s.topic})` : ''} on ${s.date} from ${s.start_time} to ${s.end_time} — Status: ${s.status}${s.notes ? ` | Notes: ${s.notes}` : ''}`
    ).join('\n')}

BUDGET SPENDING:
${budget.length === 0 ? 'No expenses logged.' : budget.map((b: any) =>
        `- ${b.category}: ${b.description || 'N/A'} — ETB ${b.amount} on ${b.date}`
    ).join('\n')}

Give a structured analysis with:
1. Study Performance (what went well, what didn't, patterns you notice)
2. Time Management (are they studying enough? too little? inconsistent?)
3. Budget Insights (spending patterns, anything concerning)
4. Recommendations (3 specific, actionable things to improve next week)

Keep it direct, honest, and under 400 words. Don't sugarcoat.`

    try {
        const response = await $fetch<any>('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.deepseekApiKey}`,
                'Content-Type': 'application/json',
            },
            body: {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 600,
            }
        })

        return { analysis: response.choices[0].message.content }
    } catch (e: any) {
        const msg = e?.data?.error?.message || e?.message || 'Unknown DeepSeek error'
        throw createError({ statusCode: 500, statusMessage: msg })
    }
})
