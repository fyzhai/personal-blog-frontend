import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cvvbhaqsrxynyakbjvfb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmJoYXFzcnh5bnlha2JqdmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDIyMzcsImV4cCI6MjA3ODMxODIzN30.Stq4w234SCIk1l__AFF9fx59-1I71h6zUuGmoP88wl8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
