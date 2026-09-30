export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "PowerFlow needs its Supabase URL and publishable key. See .env.example.",
    );
  return { url, key };
}
