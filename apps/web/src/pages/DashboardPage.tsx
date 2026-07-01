import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
        return;
      }

      // Redirect based on role
      switch (user.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'EMPLOYEE':
          navigate('/employee');
          break;
        default:
          // VIEWER stays on dashboard
          break;
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Viewer dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">Welcome to your Weapply dashboard</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Scholarships</CardTitle>
            <CardDescription>Your matched scholarships</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favorites</CardTitle>
            <CardDescription>Saved scholarships</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Your applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}