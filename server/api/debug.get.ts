import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_KEY

    if (!url || !key) {
        return { error: 'Missing env vars', url: !!url, key: !!key }
    }

    const supabase = createClient(url, key, {
        auth: { persistSession: false }
    })

    // Try inserting without user_id to test RLS
    const { data: insertData, error: insertError } = await supabase
        .from('budget_entries')
        .insert({ category: 'other', amount: 1, date: '2026-01-01', description: 'debug test' })
        .select()
        .single()

    return {
        insertOk: !insertError,
        insertError: insertError?.message ?? null,
        insertCode: insertError?.code ?? null,
        insertHint: insertError?.hint ?? null,
        insertedId: insertData?.id ?? null,
    }
})
