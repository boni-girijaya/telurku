import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://hwdmjqoosflswvewujrt.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9_GGWDDG6DhftLaOAaXYig_g7pT-x9C";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
