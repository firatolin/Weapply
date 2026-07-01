import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  Award,
  Calendar,
  TrendingUp,
  UserPlus,
  Settings,
  Shield,
  BarChart3,
  FileText,
  Mail,
  Bell,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getScholarships } from '@/api/scholarships';

// Admin stats card
interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatsCard = ({ title, value, icon, description, trend }: StatsCardProps) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className={`text-xs ${trend ? trendColors[trend] : 'text-muted-foreground'}`}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch scholarships for stats
  const { data: scholarshipsData, isLoading: scholarshipsLoading } = useQuery({
    queryKey: ['admin-scholarships'],
    queryFn: () => getScholarships(1, 100),
    staleTime: 60000,
  });

  // Mock stats (in production, fetch from API)
  const stats = {
    totalUsers: 156,
    activeUsers: 89,
    totalScholarships: scholarshipsData?.data?.length || 0,
    totalApplications: 234,
    pendingReviews: 12,
    verifiedScholarships: scholarshipsData?.data?.filter((s: any) => s.isVerified).length || 0,
  };

  if (scholarshipsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Check if user is ADMIN
  if (user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700">Access Denied</h2>
            <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
            <Link to="/dashboard">
              <Button className="mt-4">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your platform, users, and scholarships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
          <Button className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-4 w-4" />}
          description="+12% from last month"
          trend="up"
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers}
          icon={<UserPlus className="h-4 w-4" />}
          description="57% of total users"
          trend="neutral"
        />
        <StatsCard
          title="Scholarships"
          value={stats.totalScholarships}
          icon={<Award className="h-4 w-4" />}
          description={`${stats.verifiedScholarships} verified`}
          trend="up"
        />
        <StatsCard
          title="Applications"
          value={stats.totalApplications}
          icon={<FileText className="h-4 w-4" />}
          description={`${stats.pendingReviews} pending review`}
          trend="down"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">New user registered</p>
                        <p className="text-xs text-muted-foreground">2 minutes ago</p>
                      </div>
                      <Badge variant="outline">User</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New User
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Award className="h-4 w-4 mr-2" />
                  Create Scholarship
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Review Applications
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Announcement
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage all users on the platform</CardDescription>
                </div>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3">John Doe</td>
                        <td className="p-3">john@example.com</td>
                        <td className="p-3">
                          <Badge variant="outline">VIEWER</Badge>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}