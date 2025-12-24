import { supabase, isSupabaseConfigured } from './supabaseClient';

export const verifyTeamPasskey = async (passkey: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    // Local mode: use hardcoded password
    return passkey.toLowerCase() === 'team';
  }

  try {
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
  } catch (error) {
    console.error('Error verifying passkey:', error);
    return false;
  }
};

export const updateTeamPasskey = async (oldPasskey: string, newPasskey: string): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      message: 'Password change requires Supabase configuration. Please set up Supabase to change the team password.'
    };
  }

  // Verify old password first
  const isValid = await verifyTeamPasskey(oldPasskey);
  if (!isValid) {
    return {
      success: false,
      message: 'Current password is incorrect.'
    };
  }

  // Validate new password
  if (!newPasskey || newPasskey.length < 3) {
    return {
      success: false,
      message: 'New password must be at least 3 characters long.'
    };
  }

  try {
    // Deactivate old passkey
    const { error: deactivateError } = await supabase
      .from('team_passkeys')
      .update({ is_active: false })
      .eq('passkey', oldPasskey.toLowerCase())
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating old passkey:', deactivateError);
    }

    // Check if new passkey already exists
    const { data: existing } = await supabase
      .from('team_passkeys')
      .select('*')
      .eq('passkey', newPasskey.toLowerCase())
      .single();

    if (existing) {
      // Reactivate if it exists
      const { error: reactivateError } = await supabase
        .from('team_passkeys')
        .update({ is_active: true })
        .eq('passkey', newPasskey.toLowerCase());

      if (reactivateError) {
        return {
          success: false,
          message: 'Failed to update password. Please try again.'
        };
      }
    } else {
      // Create new passkey
      const { error: insertError } = await supabase
        .from('team_passkeys')
        .insert({
          passkey: newPasskey.toLowerCase(),
          is_active: true
        });

      if (insertError) {
        return {
          success: false,
          message: 'Failed to create new password. Please try again.'
        };
      }
    }

    return {
      success: true,
      message: 'Password changed successfully!'
    };
  } catch (error) {
    console.error('Error updating passkey:', error);
    return {
      success: false,
      message: 'An error occurred while changing the password.'
    };
  }
};

