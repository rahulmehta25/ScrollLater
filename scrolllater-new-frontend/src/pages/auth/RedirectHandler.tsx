import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RedirectHandler = () => {
  const location = useLocation();

  useEffect(() => {
    // Extract the access token from the URL hash
    const hash = location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresAt = params.get('expires_at');

    if (accessToken) {
      // Store the tokens in localStorage for the Lovable frontend
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        token_type: 'bearer'
      }));

      // Redirect to the Lovable frontend dashboard
      window.location.href = 'http://localhost:8080/app';
    } else {
      // No token found, redirect to sign in
      window.location.href = 'http://localhost:8080/auth/signin';
    }
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default RedirectHandler; 