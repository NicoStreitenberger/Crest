/**
 * STRN Studio — Supabase Client (Shared)
 * Loaded before any page-specific script.
 */

const SUPABASE_URL = 'https://vojwdyubksoozhyvnbfu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvandkeXVia3Nvb3poeXZuYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzU1OTcsImV4cCI6MjA5NDAxMTU5N30.8uUc1skFlGTViyaIx_JVrEwYDO6uKg6DNvaD5BfYuW0';

// Import the Supabase CDN client (loaded via <script> tag in each HTML file)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.db = db; // expose globally
