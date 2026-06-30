import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailCheck } from 'lucide-react';

export function VerifyEmailPage() {
  const { user, sendVerificationEmail, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  const handleResend = async () => {
    setLoading(true);
    try {
      await sendVerificationEmail();
      setResendCount(resendCount + 1);
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    // Check if user is already verified
    if (user?.emailVerified) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <MailCheck className="h-16 w-16 text-blue-500" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a verification email to <strong>{user?.email}</strong> for your Weapply account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Please check your inbox and click the verification link to activate your account. If you
            don't see the email, check your spam folder.
          </p>

          <div className="space-y-2">
            <Button
              onClick={handleResend}
              disabled={loading || resendCount >= 3}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>

            {resendCount >= 3 && (
              <p className="text-xs text-amber-600">
                Too many attempts. Please wait a few minutes.
              </p>
            )}

            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              I've verified my email
            </Button>

            <Button variant="ghost" className="w-full text-sm text-gray-500" onClick={handleLogout}>
              Sign out and try again
            </Button>
          </div>

          <div className="pt-4 border-t text-sm text-gray-500">
            Need help?{' '}
            <Link to="/contact" className="text-blue-600 hover:underline">
              Contact Support
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
