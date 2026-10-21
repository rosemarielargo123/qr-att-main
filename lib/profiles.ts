import { supabase } from './supabase';

export type Role = 'student' | 'teacher';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; role?: Role },
  email?: string
): Promise<{ error: string | null }> {
  // Upsert so saving works even if the profile row does not exist yet
  // (e.g. accounts created before the handle_new_user trigger existed).
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email: email ?? '', ...updates }, { onConflict: 'id' });

  return { error: error?.message ?? null };
}