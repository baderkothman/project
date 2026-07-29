import { dataClient } from '@/src/infrastructure/local-api/client';

/**
 * Validates that an authenticated user has a corresponding profile record.
 * If no profile exists, signs out the user and triggers the navigation callback.
 * 
 * @param navigateToLogin - Callback function to execute after logout (e.g., navigation)
 * @returns Promise<void>
 */
export async function fixUserSession(navigateToLogin: () => void): Promise<void> {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await dataClient.auth.getSession();
    
    if (sessionError) {
      console.warn('Error checking session:', sessionError.message);
      await handleInvalidSession(navigateToLogin);
      return;
    }

    if (!session?.user?.id) {
      console.log('No active session found');
      return;
    }

    // Check for corresponding profile
    const { data: profile, error: profileError } = await dataClient
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Error fetching profile:', profileError.message);
      await handleInvalidSession(navigateToLogin);
      return;
    }

    if (!profile) {
      console.warn('No profile found for authenticated user');
      await handleInvalidSession(navigateToLogin);
      return;
    }

    console.log('User session and profile validated successfully');
  } catch (error) {
    console.error('Unexpected error in fixUserSession:', error);
    await handleInvalidSession(navigateToLogin);
  }
}

/**
 * Helper function to handle invalid sessions by signing out and redirecting
 */
async function handleInvalidSession(navigateToLogin: () => void): Promise<void> {
  try {
    await dataClient.auth.signOut();
    console.log('User signed out due to invalid session/profile');
    navigateToLogin();
  } catch (error) {
    console.error('Error during sign out:', error);
    // Still attempt to navigate even if sign out fails
    navigateToLogin();
  }
}