import { createClient } from '@supabase/supabase-js'

// SMU APV bruger SAMME Supabase-projekt som SMU OS / SMU Wiki (delt login +
// brugere). Kun anon key — al adgang beskyttes af de stramme apv_-RLS-politikker
// (tilføjes i en senere fase; ingen migrationer i denne scaffold-fase).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL og anon key mangler i .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
