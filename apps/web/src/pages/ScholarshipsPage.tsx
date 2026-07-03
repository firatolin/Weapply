import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScholarships, Scholarship } from '../api/scholarships';
import { getFavorites, addFavorite, removeFavorite } from '../api/favorites';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink, Calendar, DollarSign, Globe, Heart, HeartOff, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ScholarshipFilters } from '@/components/filters/ScholarshipFilters';

export function ScholarshipsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const canCreate = user && (user.role === 'ADMIN' || user.role === 'EMPLOYEE');

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '10');
    if (searchTerm) params.append('search', searchTerm);
    
    // Add all filters
    Object.keys(filters).forEach(key => {
      if (Array.isArray(filters[key])) {
        filters[key].forEach((value: string) => {
          params.append(key, value);
        });
      } else if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, String(filters[key]));
      }
    });
    
    return params.toString();
  };

  // Fetch scholarships
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scholarships', page, searchTerm, filters],
    queryFn: () => getScholarships(buildQueryParams()),
    staleTime: 5000,
  });

  // Fetch user favorites
  const { data: favoritesData, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
    enabled: !!user,
    staleTime: 60000,
  });

  // Update favorites set when data changes
  useEffect(() => {
    if (favoritesData) {
      setFavorites(new Set(favoritesData.map((f: Scholarship) => f.id)));
    }
  }, [favoritesData]);

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: (data) => {
      setFavorites((prev) => new Set([...prev, data.id]));
      toast.success('Added to favorites');
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add favorite');
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: (_, scholarshipId) => {
      setFavorites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(scholarshipId);
        return newSet;
      });
      toast.success('Removed from favorites');
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove favorite');
    },
  });

  const toggleFavorite = (scholarshipId: string) => {
    if (!user) {
      toast.info('Please log in to save favorites');
      return;
    }
    if (favorites.has(scholarshipId)) {
      removeFavoriteMutation.mutate(scholarshipId);
    } else {
      addFavoriteMutation.mutate(scholarshipId);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(search);
    setPage(1);
  };

  const handleApplyFilters = (appliedFilters: any) => {
    setFilters(appliedFilters);
    setPage(1);
    refetch();
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
    refetch();
  };

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

  const isLoadingFavorite = (id: string) => {
    return addFavoriteMutation.isPending || removeFavoriteMutation.isPending;
  };

  const activeFilterCount = Object.values(filters).filter(
    v => Array.isArray(v) ? v.length > 0 : v
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Scholarships</h1>
        <div className="flex gap-2 flex-wrap">
          <ScholarshipFilters
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            activeFilters={filters}
            activeFilterCount={activeFilterCount}
          />
          {user && (
            <Link to="/favorites">
              <Button variant="outline" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favorites ({favorites.size})
              </Button>
            </Link>
          )}
          {canCreate && (
            <Link to="/scholarships/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Scholarship
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search scholarships..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
        {searchTerm && (
          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              setSearchTerm('');
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading scholarships...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Failed to load scholarships. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      )}

      {/* Scholarships Grid */}
      {!isLoading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((scholarship: Scholarship) => {
              const isFavorite = favorites.has(scholarship.id);
              const isProcessing = isLoadingFavorite(scholarship.id);

              return (
                <Card key={scholarship.id} className="hover:shadow-lg transition-shadow relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{scholarship.name}</CardTitle>
                        <CardDescription className="mt-1">{scholarship.provider}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {scholarship.isVerified && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                            ✓ Verified
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleFavorite(scholarship.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isFavorite ? (
                            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                          ) : (
                            <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
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
                          {scholarship.targetCountries?.length > 0
                            ? scholarship.targetCountries.join(', ')
                            : 'Global'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {scholarship.targetFields?.slice(0, 3).map((field) => (
                          <span
                            key={field}
                            className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                          >
                            {field}
                          </span>
                        ))}
                        {scholarship.targetFields?.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{scholarship.targetFields.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link to={`/scholarships/${scholarship.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {scholarship.applicationURL && (
                        <Button
                          variant="default"
                          className="flex-1"
                          size="sm"
                          onClick={() => window.open(scholarship.applicationURL, '_blank')}
                        >
                          Apply Now <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {data.data.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No scholarships found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}