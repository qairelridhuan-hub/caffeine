import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = "https://sxjkhvnhqahltntfwuhn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4amtodm5ocWFobHRudGZ3dWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzA1NDEsImV4cCI6MjA5Mzc0NjU0MX0.EMk21xOGPnlI7ar_k2Byn6KEN7iSoy200XwiYriJLoo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
