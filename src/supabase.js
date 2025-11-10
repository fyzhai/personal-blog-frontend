import { createClient } from '@supabase/supabase-js'

// 从环境变量中读取 Supabase URL 和 Anon Key
// 在 Vite 项目中，环境变量需要通过 import.meta.env 访问，并以 VITE_ 为前缀
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cvvbhaqsrxynyakbjvfb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmJoYXFzcnh5bnlha2JqdmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDIyMzcsImV4cCI6MjA3ODMxODIzN30.Stq4w234SCIk1l__AFF9fx59-1I71h6zUuGmoP88wl8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
