import { createClient } from '@supabase/supabase-js'

// 🔧 CONFIGURACIÓN: Reemplazá estos valores con los de tu proyecto Supabase
// Los encontrás en: Supabase Dashboard → Settings → API
const SUPABASE_URL = 'https://gmystabhmxfmvuwaltfz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_6EFLJwS4_ZgkOPnEC2tTag_eEA7CE8P'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
