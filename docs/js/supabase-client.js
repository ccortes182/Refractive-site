/* ==========================================================================
   Supabase Client — Shared singleton for auth + database
   Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY after creating
   your Supabase project at https://supabase.com/dashboard
   ========================================================================== */

(function() {
  var SUPABASE_URL  = 'https://rdwmyryoncvwumorgyuo.supabase.co';
  var SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkd215cnlvbmN2d3Vtb3JneXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTcwMDIsImV4cCI6MjA5MDkzMzAwMn0.pQk0VZrwHAEPw10a6eZEHX0tumO6H3cgkqMrQe_30rI';

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('[Refractive] Supabase SDK not loaded. Auth features disabled.');
    return;
  }

  window.RefractiveSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
