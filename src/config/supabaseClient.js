import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

let supabase = null;
if (ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY) {
  supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
}

export { supabase };
