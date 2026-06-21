import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://msguumnynnzlwwejlffn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_a2hZ6Uv2yPSmVZW6BebEuA_spqDsH_g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
