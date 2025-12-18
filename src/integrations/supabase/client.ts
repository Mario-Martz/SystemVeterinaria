import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string;

console.log("🔎 SUPABASE_URL:", SUPABASE_URL);
console.log("🔎 SUPABASE_KEY:", SUPABASE_KEY ? "Cargada ✔" : "❌ No cargada");


if (!SUPABASE_URL) console.error("❌ ERROR: VITE_SUPABASE_URL no está definida en .env");
if (!SUPABASE_KEY) console.error("❌ ERROR: VITE_SUPABASE_KEY no está definida en .env");

export const supabase = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            storage: localStorage,
            autoRefreshToken: true,
            persistSession: true,
        }
    }
);
