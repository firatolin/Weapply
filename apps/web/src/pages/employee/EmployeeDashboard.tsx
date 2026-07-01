import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Briefcase,
  Plus,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Users,
  Award,
  Calendar,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeStats } from '@/api/employee';
import { toast } from 'sonner';

export function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('my-work');

  // Fetch employee stats with refetch interval
  const { data: statsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: getEmployeeStats,
    staleTime: 30000,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });

  // Manual refresh function
  const handleRefresh = async () => {
    await refetch();
    toast.success('Dashboard refreshed');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user?.role !== 'EMPLOYEE' && user?.role !== 'ADMIN') {
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
  const allScholarships = statsData?.allScholarships || [];
  const recentScholarships = statsData?.recentScholarships || allScholarships.slice(0, 5);

  // Count pending and verified scholarships
  const pendingCount = allScholarships.filter((s: any) => !s.isVerified).length;
  const verifiedCount = allScholarships.filter((s: any) => s.isVerified).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Employee Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your scholarships and applications
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {user?.role}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/scholarships/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Scholarship
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Scholarships</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.myScholarships || 0}</div>
            <div className="flex gap-2 mt-1">
              <span className="text-xs text-green-600">✓ {verifiedCount} verified</span>
              <span className="text-xs text-yellow-600">⏳ {pendingCount} pending</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReviews || 0}</div>
            <p className="text-xs text-muted-foreground">Waiting for admin verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.applications || 0}</div>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalScholarships && stats.totalScholarships > 0
                ? Math.round((stats.verifiedScholarships / stats.totalScholarships) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.verifiedScholarships || 0} of {stats?.totalScholarships || 0} verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-work">My Work</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* My Work Tab */}
        <TabsContent value="my-work">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>My Scholarships</CardTitle>
                  <CardDescription>Scholarships you've created</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {verifiedCount} Verified
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {pendingCount} Pending
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {allScholarships.length > 0 ? (
                <div className="space-y-4">
                  {allScholarships.map((scholarship: any) => (
                    <div
                      key={scholarship.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{scholarship.name}</h3>
                          {scholarship.isVerified ? (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{scholarship.provider}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Created: {new Date(scholarship.createdAt).toLocaleDateString()}</span>
                          {scholarship.isVerified && scholarship.lastVerifiedAt && (
                            <span className="text-green-600">
                              Verified: {new Date(scholarship.lastVerifiedAt).toLocaleDateString()}
                            </span>
                          )}
                          <span>👁️ {scholarship.viewCount || 0} views</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/scholarships/${scholarship.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/scholarships/edit/${scholarship.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">You haven't created any scholarships yet</p>
                  <Link to="/scholarships/create">
                    <Button className="mt-4">Create Your First Scholarship</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>Applications received for your scholarships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No applications received yet</p>
                <p className="text-sm text-muted-foreground">Applications will appear here once students apply to your scholarships</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>Scholarships waiting for admin verification</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingCount > 0 ? (
                <div className="space-y-4">
                  {allScholarships
                    .filter((s: any) => !s.isVerified)
                    .map((scholarship: any) => (
                      <div
                        key={scholarship.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                      >
                        <div>
                          <h3 className="font-medium">{scholarship.name}</h3>
                          <p className="text-sm text-muted-foreground">{scholarship.provider}</p>
                          <p className="text-xs text-yellow-600 mt-1">⏳ Awaiting admin verification</p>
                        </div>
                        <Link to={`/scholarships/${scholarship.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">All caught up! No pending reviews</p>
                  <p className="text-sm text-muted-foreground">All your scholarships have been verified</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}