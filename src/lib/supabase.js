import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const audioBucketName =
  import.meta.env.VITE_SUPABASE_AUDIO_BUCKET || 'story-audio'
export const coverBucketName =
  import.meta.env.VITE_SUPABASE_COVER_BUCKET || 'story-covers'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.',
    )
  }

  return supabase
}
