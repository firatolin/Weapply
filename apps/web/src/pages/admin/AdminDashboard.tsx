import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Award,
  Clock,
  FileText,
  Settings,
  Shield,
  Bell,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminStats, getAdminUsers, updateUserRole, deleteUser } from '@/api/admin';
import { getScholarships as getPendingScholarships, verifyScholarship } from '@/api/scholarships';
import { toast } from 'sonner';

// Stats card component
const StatsCard = ({ title, value, icon, description, trend }: { title: string; value: number; icon: JSX.Element; description?: string; trend?: 'up' | 'down' | 'neutral' }) => {
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Fetch admin stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    staleTime: 60000,
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', searchTerm, roleFilter],
    queryFn: () => getAdminUsers(1, 10, searchTerm, roleFilter),
    staleTime: 30000,
  });

  // Fetch pending scholarships for verification
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pending-scholarships'],
    queryFn: () => getPendingScholarships(1, 20, '', 'createdAt', 'asc'),
    staleTime: 30000,
    enabled: activeTab === 'scholarships',
  });

  // Filter pending scholarships (isVerified: false)
  const pendingScholarships = pendingData?.data?.filter((s: any) => !s.isVerified) || [];

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      verifyScholarship(id, verified),
    onSuccess: () => {
      toast.success('Scholarship status updated');
      queryClient.invalidateQueries({ queryKey: ['pending-scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      refetchPending();
      refetchStats();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update scholarship');
    },
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success('User role updated successfully');
      refetchUsers();
      refetchStats();
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
        toast.success('User deleted successfully');
        refetchUsers();
        refetchStats();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  if (statsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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

  const stats = statsData?.stats;
  const recentUsers = statsData?.recentUsers || [];
  const recentScholarships = statsData?.recentScholarships || [];

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
          value={stats?.totalUsers || 0}
          icon={<Users className="h-4 w-4" />}
          description={`${stats?.activeUsers || 0} active users`}
          trend="up"
        />
        <StatsCard
          title="Total Scholarships"
          value={stats?.totalScholarships || 0}
          icon={<Award className="h-4 w-4" />}
          description={`${stats?.verifiedScholarships || 0} verified`}
          trend="up"
        />
        <StatsCard
          title="Pending Reviews"
          value={stats?.pendingScholarships || 0}
          icon={<Clock className="h-4 w-4" />}
          description="Waiting for verification"
          trend="neutral"
        />
        <StatsCard
          title="Total Favorites"
          value={stats?.totalFavorites || 0}
          icon={<FileText className="h-4 w-4" />}
          description="Saved by users"
          trend="up"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Latest registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.length > 0 ? (
                    recentUsers.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{u.displayName || u.email}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge variant="outline">{u.role}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent users</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Scholarships */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Scholarships</CardTitle>
                <CardDescription>Latest added scholarships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentScholarships.length > 0 ? (
                    recentScholarships.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Award className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.provider}</p>
                        </div>
                        {s.isVerified ? (
                          <Badge className="bg-green-100 text-green-800">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent scholarships</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage all users on the platform</CardDescription>
                </div>
                <Button size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <Button variant="outline" onClick={() => { setSearchTerm(''); setRoleFilter(''); }}>
                  Clear Filters
                </Button>
              </div>

              {/* Users Table */}
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData?.data?.length > 0 ? (
                      usersData.data.map((u: any) => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="p-3 font-medium">{u.displayName || u.profile?.firstName || 'User'}</td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3">
                            <select
                              className="border rounded px-2 py-1 text-xs"
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={u.id === user?.dbId}
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EMPLOYEE">Employee</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </td>
                          <td className="p-3">
                            {u.emailVerified ? (
                              <Badge className="bg-green-100 text-green-800">Verified</Badge>
                            ) : (
                              <Badge variant="outline">Unverified</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.id === user?.dbId}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersData?.pagination && usersData.pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {usersData.data?.length || 0} of {usersData.pagination.total} users
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scholarships Tab - Updated with Verification */}
        <TabsContent value="scholarships">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <CardTitle>Scholarship Management</CardTitle>
                  <CardDescription>Review and verify scholarships</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {pendingScholarships.length} Pending
                  </Badge>
                  <Link to="/scholarships">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : pendingScholarships.length > 0 ? (
                <div className="space-y-4">
                  {pendingScholarships.map((scholarship: any) => (
                    <div
                      key={scholarship.id}
                      className="flex flex-wrap items-center justify-between p-4 border rounded-lg hover:bg-gray-50 gap-4"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{scholarship.name}</h3>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            ⏳ Pending
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{scholarship.provider}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>
                            Created by: {scholarship.createdByUser?.displayName || scholarship.createdByUser?.email || 'Unknown'}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(scholarship.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => verifyMutation.mutate({ id: scholarship.id, verified: true })}
                          disabled={verifyMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => verifyMutation.mutate({ id: scholarship.id, verified: false })}
                          disabled={verifyMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">All scholarships are verified!</p>
                  <p className="text-sm text-muted-foreground">No pending reviews</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}