import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFavorites, removeFavorite } from '../api/favorites';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, HeartOff, Calendar, DollarSign, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function FavoritesPage() {
  const { data: favorites, isLoading, error, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
    staleTime: 60000,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      toast.success('Removed from favorites');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove favorite');
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return `$${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-2 text-gray-500">Loading favorites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Failed to load favorites</p>
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="h-8 w-8 text-red-500 fill-red-500" />
        <h1 className="text-3xl font-bold">My Favorites</h1>
        <span className="text-sm text-muted-foreground">({favorites?.length || 0} scholarships)</span>
      </div>

      {favorites && favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((scholarship: any) => (
            <Card key={scholarship.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{scholarship.name}</CardTitle>
                    <CardDescription className="mt-1">{scholarship.provider}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeFavoriteMutation.mutate(scholarship.id)}
                    disabled={removeFavoriteMutation.isPending}
                  >
                    {removeFavoriteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <HeartOff className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {scholarship.description || 'No description available'}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span>
                      {scholarship.amountMin && scholarship.amountMax
                        ? `${formatCurrency(scholarship.amountMin)} - ${formatCurrency(scholarship.amountMax)}`
                        : 'Amount not specified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Deadline: {formatDate(scholarship.applicationDeadline)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span>
                      {scholarship.targetCountries.length > 0
                        ? scholarship.targetCountries.join(', ')
                        : 'Global'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <Link to={`/scholarships/${scholarship.id}`} className="block">
                    <Button variant="outline" className="w-full" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">No favorites yet</h2>
          <p className="text-muted-foreground mt-2">
            Start exploring scholarships and save the ones you love
          </p>
          <Link to="/scholarships">
            <Button className="mt-4">Browse Scholarships</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// Removed incorrect implementation of useMutation as it is imported from @tanstack/react-query.
