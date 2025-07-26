// Session restoration utility for handling OAuth redirects
export const restoreSessionFromStorage = async () => {
  try {
    const storedToken = localStorage.getItem('supabase.auth.token');
    if (!storedToken) {
      console.log('No stored session found');
      return null;
    }

    const tokenData = JSON.parse(storedToken);
    console.log('Found stored token data:', tokenData);

    // Check if token is still valid
    const expiresAt = tokenData.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && now > expiresAt) {
      console.log('Stored token has expired');
      localStorage.removeItem('supabase.auth.token');
      return null;
    }

    return tokenData;
  } catch (error) {
    console.error('Error restoring session:', error);
    return null;
  }
};

export const clearStoredSession = () => {
  try {
    localStorage.removeItem('supabase.auth.token');
    console.log('Cleared stored session');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}; 