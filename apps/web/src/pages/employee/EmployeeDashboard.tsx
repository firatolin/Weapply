import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeStats } from '@/api/employee';
import { toast } from 'sonner';

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-work');

  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: getEmployeeStats,
    staleTime: 30000,
  });

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
  const recentScholarships = statsData?.recentScholarships || [];
  const allScholarships = statsData?.allScholarships || [];

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
        </div>
        <Link to="/scholarships/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Scholarship
          </Button>
        </Link>
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
            <p className="text-xs text-muted-foreground">
              {stats?.verifiedScholarships || 0} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReviews || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
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
              {stats?.totalScholarships > 0
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
              <CardTitle>My Scholarships</CardTitle>
              <CardDescription>Scholarships you've created</CardDescription>
            </CardHeader>
            <CardContent>
              {allScholarships.length > 0 ? (
                <div className="space-y-4">
                  {allScholarships.map((scholarship: any) => (
                    <div
                      key={scholarship.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{scholarship.name}</h3>
                        <p className="text-sm text-muted-foreground">{scholarship.provider}</p>
                        <div className="flex gap-2 mt-1">
                          {scholarship.isVerified ? (
                            <Badge className="bg-green-100 text-green-800">Verified</Badge>
                          ) : (
                            <Badge variant="outline">Pending Verification</Badge>
                          )}
                          <Badge variant="outline">Active</Badge>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>Scholarships waiting for your review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">All caught up! No pending reviews</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}