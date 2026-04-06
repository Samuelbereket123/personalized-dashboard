import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_KEY

    if (!url || !key) {
        return { error: 'Missing env vars', url: !!url, key: !!key }
    }

    const supabase = createClient(url, key)

    // Try inserting a test entry
    const { data: insertData, error: insertError } = await supabase
        .from('budget_entries')
        .insert({ category: 'other', amount: 1, date: '2026-01-01', description: 'debug test' })
        .select()
        .single()

    // Read back
    const { data: readData, error: readError } = await supabase
        .from('budget_entries')
        .select('id')
        .limit(1)

    return {
        insertOk: !insertError,
        insertError: insertError?.message ?? null,
        insertCode: insertError?.code ?? null,
        readOk: !readError,
        readError: readError?.message ?? null,
        hasData: (readData?.length ?? 0) > 0,
        insertedId: insertData?.id ?? null,
    }
})
