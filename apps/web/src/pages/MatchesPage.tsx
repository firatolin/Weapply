import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  Award, 
  GraduationCap, 
  MapPin, 
  DollarSign,
  Users,
  Clock,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Lightbulb,
  Target,
  Globe,
  BookOpen,
  PiggyBank
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/client';

interface Match {
  scholarship: {
    id: string;
    name: string;
    description: string;
    provider: string;
    providerType: string;
    scholarshipType: string;
    amountMin: number;
    amountMax: number;
    amountCurrency: string;
    applicationDeadline: string;
    targetFields: string[];
    targetCountries: string[];
    isVerified: boolean;
    applicationURL?: string;
  };
  score: number;
  reasoning: string;
  breakdown: {
    fieldMatch: number;
    educationMatch: number;
    countryMatch: number;
    financialFit: number;
  };
  suggestions: string[];
}

export function MatchesPage() {
  const { user } = useAuth();
  const [filterScore, setFilterScore] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch matches
  const { data: matchesData, isLoading, error, refetch } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const response = await apiClient.get('/matches/me');
      return response.data;
    },
    enabled: !!user,
    retry: 1,
  });

  // Safe data extraction
  const matches: Match[] = matchesData?.data || [];
  const needsProfile = matchesData?.needsProfile || false;
  const averageScore = matchesData?.averageScore || 0;
  const totalMatches = matchesData?.totalMatches || 0;

  // Filter matches by score
  const filteredMatches = filterScore > 0 
    ? matches.filter((m: Match) => m.score >= filterScore)
    : matches;

  const sortedMatches = [...filteredMatches].sort((a, b) => b.score - a.score);

  const topMatches = sortedMatches.filter((m: Match) => m.score >= 70);
  const goodMatches = sortedMatches.filter((m: Match) => m.score >= 50 && m.score < 70);
  const otherMatches = sortedMatches.filter((m: Match) => m.score < 50);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-gray-100';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '👍';
    if (score >= 40) return '📚';
    return '🔍';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
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
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-muted-foreground">Finding your perfect matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Failed to load matches</p>
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (needsProfile) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Complete Your Profile First</h1>
        <p className="text-muted-foreground mb-6">
          We need to know more about you to find the best scholarship matches.
        </p>
        <Link to="/profile/edit">
          <Button className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Complete Profile
          </Button>
        </Link>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <Award className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">No Matches Found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn't find any scholarships that match your profile right now.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/profile/edit">
            <Button variant="outline">Update Profile</Button>
          </Link>
          <Link to="/scholarships">
            <Button>Browse All Scholarships</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            Your Matches
          </h1>
          <p className="text-muted-foreground">
            {totalMatches} scholarships matched • 
            Average match score: <span className="font-semibold">{Math.round(averageScore)}%</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/profile/edit">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Update Profile
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Top Matches</span>
            </div>
            <p className="text-2xl font-bold">{topMatches.length}</p>
            <p className="text-xs text-muted-foreground">Score ≥ 70%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Good Matches</span>
            </div>
            <p className="text-2xl font-bold">{goodMatches.length}</p>
            <p className="text-xs text-muted-foreground">50% - 69%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Other Matches</span>
            </div>
            <p className="text-2xl font-bold">{otherMatches.length}</p>
            <p className="text-xs text-muted-foreground">Below 50%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Best Match Score</span>
            </div>
            <p className="text-2xl font-bold">
              {sortedMatches.length > 0 ? `${sortedMatches[0].score}%` : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Highest match</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Min Score:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[0, 30, 50, 70, 80].map((score) => (
                  <Button
                    key={score}
                    variant={filterScore === score ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterScore(score)}
                  >
                    {score === 0 ? 'All' : `${score}%+`}
                  </Button>
                ))}
              </div>
              {filterScore > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFilterScore(0)}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches List */}
      <div className="space-y-4">
        {sortedMatches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No matches found with the current filter.</p>
            <Button variant="outline" onClick={() => setFilterScore(0)} className="mt-2">
              Clear Filter
            </Button>
          </div>
        ) : (
          sortedMatches.map((match: Match) => (
            <Card key={match.scholarship.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Score Badge */}
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${getScoreBgColor(match.score)} ${getScoreColor(match.score)}`}>
                      {match.score}%
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">Match Score</span>
                    <span className="text-2xl">{getScoreEmoji(match.score)}</span>
                  </div>

                  {/* Scholarship Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link to={`/scholarships/${match.scholarship.id}`}>
                          <h3 className="text-xl font-semibold hover:text-blue-600 transition-colors">
                            {match.scholarship.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">{match.scholarship.provider}</p>
                      </div>
                      {match.scholarship.isVerified && (
                        <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                      {match.scholarship.description || 'No description available'}
                    </p>

                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span>
                          {match.scholarship.amountMin && match.scholarship.amountMax
                            ? `${formatCurrency(match.scholarship.amountMin)} - ${formatCurrency(match.scholarship.amountMax)}`
                            : 'Amount not specified'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4 text-gray-400" />
                        <span className="truncate">
                          {match.scholarship.targetFields?.slice(0, 2).join(', ') || 'Any field'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>
                          {match.scholarship.targetCountries?.length > 0
                            ? match.scholarship.targetCountries.slice(0, 2).join(', ')
                            : 'Global'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Due: {formatDate(match.scholarship.applicationDeadline)}</span>
                      </div>
                    </div>

                    {/* AI Match Breakdown - UPDATED */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-2">🤖 Why this matches you:</p>
                      
                      {/* AI Reasoning */}
                      {match.reasoning && (
                        <p className="text-sm text-gray-700 mb-2">{match.reasoning}</p>
                      )}
                      
                      {/* Breakdown Scores */}
                      {match.breakdown && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            🎓 Field: {match.breakdown.fieldMatch}%
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            📚 Education: {match.breakdown.educationMatch}%
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            🌍 Country: {match.breakdown.countryMatch}%
                          </span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            💰 Financial: {match.breakdown.financialFit}%
                          </span>
                        </div>
                      )}
                      
                      {/* AI Suggestions */}
                      {match.suggestions && match.suggestions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-blue-600 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Suggestions to improve your match:
                          </p>
                          <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                            {match.suggestions.map((suggestion: string, idx: number) => (
                              <li key={idx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Link to={`/scholarships/${match.scholarship.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {match.scholarship.applicationURL && (
                        <Button
                          size="sm"
                          onClick={() => window.open(match.scholarship.applicationURL, '_blank')}
                        >
                          Apply Now
                        </Button>
                      )}
                      <Link to={`/matches/${match.scholarship.id}`}>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          Match Details <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}