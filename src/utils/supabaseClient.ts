import { createClient } from "@supabase/supabase-js";

// Use placeholders if env variables are empty to prevent createClient from crashing Next.js during SSR/build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-disabled.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn("Supabase URL or Key is missing. Database features will run in demo/offline mode.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);


