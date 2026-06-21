import { createClient } from '@supabase/supabase-js'

// Bỏ đoạn /rest/v1/ ở cuối đường link
const supabaseUrl = 'https://pnlwwkvpawtwcivosyvc.supabase.co'
const supabaseAnonKey = 'sb_publishable_fhgcNRBUApCRFh4_PYX7Yg_lD_-HSco'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)