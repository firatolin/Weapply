import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User, Mail, Calendar, Globe, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile } from '../api/auth';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../api/auth';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

  // Fetch user profile data
  const { data: userData, refetch } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getCurrentUser,
    enabled: !!user,
    staleTime: 60000,
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ displayName, photoURL });
      await refreshUser();
      await refetch();
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.displayName || '');
    setPhotoURL(user?.photoURL || '');
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">My Profile</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={photoURL || user.photoURL || undefined} />
              <AvatarFallback className="text-xl">
                {getInitials(user.displayName || user.email || 'User')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user.displayName || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.emailVerified && (
                <span className="text-xs text-green-600">✓ Email verified</span>
              )}
            </div>
          </div>

          {/* Profile Fields */}
          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Display Name</Label>
              {isEditing ? (
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              ) : (
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{user.displayName || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Email</Label>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
            </div>

            {/* Photo URL */}
            {isEditing && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Photo URL</Label>
                <Input
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL for your profile picture
                </p>
              </div>
            )}

            {/* Account Created */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Account Created</Label>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(user.metadata?.creationTime)}</span>
              </div>
            </div>

            {/* Last Login */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Last Login</Label>
              <div className="flex items-center gap-2 text-gray-700">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(user.metadata?.lastSignInTime)}</span>
              </div>
            </div>

            {/* User ID (for admin purposes) */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">User ID</Label>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-xs font-mono text-muted-foreground">{user.uid}</span>
              </div>
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}