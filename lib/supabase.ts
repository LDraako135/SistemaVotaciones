import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vatnummomqccownwenzi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdG51bW1vbXFjY293bndlbnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODExOTUsImV4cCI6MjA2NDA1NzE5NX0.6UK08hYY4zYT7Quy1si-dLgjK3iv6f0OYjSYWLjUO-4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
