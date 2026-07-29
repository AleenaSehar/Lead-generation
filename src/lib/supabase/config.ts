const PLACEHOLDER_VALUES = ["your-project-ref", "replace_me", "ci-placeholder", "ci_placeholder"];

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey || PLACEHOLDER_VALUES.some((value) => url.includes(value) || publishableKey.includes(value))) {
    throw new Error(
      "Supabase Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.",
    );
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured() {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}
