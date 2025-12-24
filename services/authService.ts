import { supabase } from './supabaseClient';

export const verifyTeamPasskey = async (passkey: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('team_passkeys')
    .select('*')
    .eq('passkey', passkey.toLowerCase())
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
};

