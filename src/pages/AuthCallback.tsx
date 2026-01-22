import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the session and check for errors
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error during OAuth callback:', error);
          setError(error.message);
          setLoading(false);
          return;
        }

        // If we have a session and a user
        if (data.session?.user) {
          // Get the user's metadata to determine their role
          const userData = data.session.user.user_metadata;
          let role = userData?.role as 'teacher' | 'student';

          // If role not in metadata, check URL params (backup)
          if (!role) {
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
            role = (urlParams.get('role') || hashParams.get('role') || 'student') as 'teacher' | 'student';
          }

          // Update the profile in the database to ensure role is set correctly
          const { error: updateError } = await supabase
            .from('profiles')
            .upsert({
              id: data.session.user.id,
              email: data.session.user.email,
              full_name: userData?.name || userData?.full_name || data.session.user.email?.split('@')[0],
              avatar_url: userData?.avatar_url || userData?.picture,
              role: role
            }, { onConflict: 'id' });

          if (updateError) {
            console.error('Error updating profile:', updateError);
          }

          // Also update user metadata to ensure consistency
          await supabase.auth.updateUser({
            data: { role: role }
          });

          // Redirect based on role
          if (role === 'teacher') {
            navigate('/dashboard');
          } else {
            navigate('/student');
          }
        } else {
          // If no session, redirect to login
          setError('Authentication failed. Please try again.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } catch (err) {
        console.error('Exception during OAuth callback:', err);
        setError('An unexpected error occurred during authentication.');
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-teachsync-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {loading ? (
            <div className="space-y-4">
              <div className="bg-primary text-white p-3 rounded-lg text-2xl font-bold mx-auto w-12 h-12 flex items-center justify-center">TS</div>
              <h1 className="text-2xl font-bold">Completing Sign In...</h1>
              <p className="text-muted-foreground">Please wait while we authenticate your account.</p>
              <div className="flex justify-center mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="bg-red-500 text-white p-3 rounded-lg text-2xl font-bold mx-auto w-12 h-12 flex items-center justify-center">!</div>
              <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
              <p className="text-muted-foreground">{error}</p>
              <p className="text-sm">Redirecting you back to the login page...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-500 text-white p-3 rounded-lg text-2xl font-bold mx-auto w-12 h-12 flex items-center justify-center">✓</div>
              <h1 className="text-2xl font-bold text-green-600">Authentication Successful!</h1>
              <p className="text-muted-foreground">You are now signed in. Redirecting you...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;