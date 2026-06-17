// Supabase connection. URL + publishable key are public (used in the browser);
// row-level security is what protects the data.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qwuuzcuferetdacqihrg.supabase.co";

export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local");
}
