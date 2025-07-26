import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('OAuth callback error:', error);
          navigate('/auth/signin?error=oauth_failed');
          return;
        }

        if (session) {
          // Successfully authenticated, redirect to dashboard
          navigate('/app');
        } else {
          // No session found, redirect to sign in
          navigate('/auth/signin');
        }
      } catch (error) {
        console.error('OAuth callback failed:', error);
        navigate('/auth/signin?error=oauth_failed');
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback; 