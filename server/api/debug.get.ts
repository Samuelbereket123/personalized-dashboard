import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_KEY

    if (!url || !key) {
        return { error: 'Missing env vars', url: !!url, key: !!key }
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase.from('budget_entries').select('id').limit(1)

    return {
        envOk: true,
        supabaseOk: !error,
        error: error?.message ?? null,
        hasData: (data?.length ?? 0) > 0,
    }
})
