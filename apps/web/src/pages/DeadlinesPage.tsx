import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Calendar, Clock, Trash2, Edit, CheckCircle, XCircle, Bell, Filter } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/client';

interface Deadline {
  id: string;
  title: string;
  description?: string;
  type: string;
  dueDate: string;
  dueTimezone: string;
  reminderOffset?: number;
  isCompleted: boolean;
  completedAt?: string;
  priority: string;
  notes?: string;
  scholarship?: {
    id: string;
    name: string;
    provider: string;
  };
  university?: {
    id: string;
    name: string;
    country: string;
  };
  reminders: {
    id: string;
    scheduledAt: string;
    sentAt?: string;
    channel: string;
    status: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export function DeadlinesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('upcoming');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'APPLICATION',
    dueDate: '',
    priority: 'MEDIUM',
    reminderOffset: 7 * 24 * 60, // 7 days in minutes
    notes: '',
  });

  // Fetch deadlines
  const { data: deadlines, isLoading, refetch } = useQuery({
    queryKey: ['deadlines'],
    queryFn: async () => {
      const response = await apiClient.get('/deadlines');
      return response.data.data;
    },
    enabled: !!user,
  });

  // Fetch upcoming deadlines
  const { data: upcomingDeadlines, isLoading: upcomingLoading } = useQuery({
    queryKey: ['upcoming-deadlines'],
    queryFn: async () => {
      const response = await apiClient.get('/deadlines/upcoming?days=30');
      return response.data.data;
    },
    enabled: !!user,
  });

  // Create deadline mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/deadlines', data);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Deadline created successfully! 🎉');
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        type: 'APPLICATION',
        dueDate: '',
        priority: 'MEDIUM',
        reminderOffset: 7 * 24 * 60,
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create deadline');
    },
  });

  // Update deadline mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/deadlines/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Deadline updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedDeadline(null);
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update deadline');
    },
  });

  // Complete deadline mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/deadlines/${id}/complete`);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Deadline marked as complete! ✅');
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete deadline');
    },
  });

  // Delete deadline mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/deadlines/${id}`);
    },
    onSuccess: () => {
      toast.success('Deadline deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedDeadline(null);
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete deadline');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dueDate) {
      toast.error('Please select a due date');
      return;
    }
    createMutation.mutate({
      ...formData,
      dueDate: new Date(formData.dueDate).toISOString(),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeadline) return;
    updateMutation.mutate({
      id: selectedDeadline.id,
      data: {
        ...formData,
        dueDate: new Date(formData.dueDate).toISOString(),
      },
    });
  };

  const openEditDialog = (deadline: Deadline) => {
    setSelectedDeadline(deadline);
    setFormData({
      title: deadline.title,
      description: deadline.description || '',
      type: deadline.type,
      dueDate: deadline.dueDate.slice(0, 16),
      priority: deadline.priority,
      reminderOffset: deadline.reminderOffset || 7 * 24 * 60,
      notes: deadline.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-yellow-100 text-yellow-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.MEDIUM;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      APPLICATION: 'Application',
      SCHOLARSHIP: 'Scholarship',
      ADMISSION: 'Admission',
      DOCUMENT: 'Document',
      INTERVIEW: 'Interview',
      TEST: 'Test',
      OTHER: 'Other',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysUntil = (dateString: string) => {
    const now = new Date();
    const due = new Date(dateString);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold">Please log in to view deadlines</h2>
        <Link to="/login">
          <Button className="mt-4">Log In</Button>
        </Link>
      </div>
    );
  }

  const displayDeadlines = selectedTab === 'upcoming' ? upcomingDeadlines : deadlines;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Deadlines
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your scholarship and university application deadlines
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Deadline
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Deadline</DialogTitle>
              <DialogDescription>
                Create a new deadline to track your applications.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. MIT Application Deadline"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPLICATION">Application</SelectItem>
                      <SelectItem value="SCHOLARSHIP">Scholarship</SelectItem>
                      <SelectItem value="ADMISSION">Admission</SelectItem>
                      <SelectItem value="DOCUMENT">Document</SelectItem>
                      <SelectItem value="INTERVIEW">Interview</SelectItem>
                      <SelectItem value="TEST">Test</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Add details about this deadline..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Deadline'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming (30 days)</TabsTrigger>
          <TabsTrigger value="all">All Deadlines</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : upcomingDeadlines?.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming deadlines</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a deadline to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingDeadlines?.map((deadline: Deadline) => (
                <DeadlineCard
                  key={deadline.id}
                  deadline={deadline}
                  onEdit={openEditDialog}
                  onComplete={() => completeMutation.mutate(deadline.id)}
                  onDelete={() => {
                    setSelectedDeadline(deadline);
                    setIsDeleteDialogOpen(true);
                  }}
                  getPriorityColor={getPriorityColor}
                  getTypeLabel={getTypeLabel}
                  formatDate={formatDate}
                  getDaysUntil={getDaysUntil}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : deadlines?.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No deadlines yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first deadline to start tracking
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deadlines?.map((deadline: Deadline) => (
                <DeadlineCard
                  key={deadline.id}
                  deadline={deadline}
                  onEdit={openEditDialog}
                  onComplete={() => completeMutation.mutate(deadline.id)}
                  onDelete={() => {
                    setSelectedDeadline(deadline);
                    setIsDeleteDialogOpen(true);
                  }}
                  getPriorityColor={getPriorityColor}
                  getTypeLabel={getTypeLabel}
                  formatDate={formatDate}
                  getDaysUntil={getDaysUntil}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Deadline</DialogTitle>
            <DialogDescription>
              Update the details of this deadline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g. MIT Application Deadline"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPLICATION">Application</SelectItem>
                    <SelectItem value="SCHOLARSHIP">Scholarship</SelectItem>
                    <SelectItem value="ADMISSION">Admission</SelectItem>
                    <SelectItem value="DOCUMENT">Document</SelectItem>
                    <SelectItem value="INTERVIEW">Interview</SelectItem>
                    <SelectItem value="TEST">Test</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-dueDate">Due Date *</Label>
                <Input
                  id="edit-dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Add details about this deadline..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the deadline
              {selectedDeadline && ` "${selectedDeadline.title}"`} and all its reminders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (selectedDeadline) {
                  deleteMutation.mutate(selectedDeadline.id);
                }
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Deadline Card Component
interface DeadlineCardProps {
  deadline: Deadline;
  onEdit: (deadline: Deadline) => void;
  onComplete: () => void;
  onDelete: () => void;
  getPriorityColor: (priority: string) => string;
  getTypeLabel: (type: string) => string;
  formatDate: (date: string) => string;
  getDaysUntil: (date: string) => string;
}

function DeadlineCard({
  deadline,
  onEdit,
  onComplete,
  onDelete,
  getPriorityColor,
  getTypeLabel,
  formatDate,
  getDaysUntil,
}: DeadlineCardProps) {
  const isOverdue = new Date(deadline.dueDate) < new Date() && !deadline.isCompleted;
  const daysUntil = getDaysUntil(deadline.dueDate);

  return (
    <Card className={`hover:shadow-lg transition-shadow ${deadline.isCompleted ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">
                {deadline.isCompleted ? (
                  <span className="line-through">{deadline.title}</span>
                ) : (
                  deadline.title
                )}
              </CardTitle>
              <Badge className={getPriorityColor(deadline.priority)}>
                {deadline.priority}
              </Badge>
              <Badge variant="outline">{getTypeLabel(deadline.type)}</Badge>
            </div>
            <CardDescription className="mt-1">
              {deadline.scholarship?.name || deadline.university?.name || 'No related entity'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!deadline.isCompleted && (
              <Button variant="ghost" size="icon" onClick={onComplete}>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onEdit(deadline)}>
              <Edit className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {deadline.description && (
          <p className="text-sm text-muted-foreground">{deadline.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(deadline.dueDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
              {isOverdue ? 'Overdue!' : daysUntil}
            </span>
          </div>
          {deadline.reminders && deadline.reminders.length > 0 && (
            <div className="flex items-center gap-1">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span>{deadline.reminders.length} reminder(s)</span>
            </div>
          )}
        </div>
        {deadline.isCompleted && deadline.completedAt && (
          <p className="text-xs text-muted-foreground">
            ✅ Completed on: {new Date(deadline.completedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
