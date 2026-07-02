import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Award, GraduationCap, MapPin, DollarSign, TrendingUp } from 'lucide-react';
import apiClient from '@/api/client';

export function MatchDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['match-details', id],
    queryFn: async () => {
      const response = await apiClient.get(`/matches/scholarship/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Match not found</p>
        <Link to="/matches">
          <Button className="mt-4">Back to Matches</Button>
        </Link>
      </div>
    );
  }

  const { scholarship, score, breakdown, reasons } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/matches">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Matches
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{scholarship.name}</CardTitle>
              <CardDescription>{scholarship.provider}</CardDescription>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">{score}%</div>
              <div className="text-sm text-muted-foreground">Match Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Match Breakdown */}
          <div>
            <h3 className="font-semibold mb-3">Match Breakdown</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Field of Study</span>
                  <span>{breakdown.fieldMatch}%</span>
                </div>
                <Progress value={breakdown.fieldMatch} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Education Level</span>
                  <span>{breakdown.educationMatch}%</span>
                </div>
                <Progress value={breakdown.educationMatch} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Country Eligibility</span>
                  <span>{breakdown.countryMatch}%</span>
                </div>
                <Progress value={breakdown.countryMatch} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Financial Fit</span>
                  <span>{breakdown.financialFit}%</span>
                </div>
                <Progress value={breakdown.financialFit} className="h-2" />
              </div>
            </div>
          </div>

          {/* Reasons */}
          <div>
            <h3 className="font-semibold mb-2">Why This Matches You</h3>
            <ul className="space-y-1">
              {reasons.map((reason: string, index: number) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Scholarship Details */}
          <div>
            <h3 className="font-semibold mb-2">Scholarship Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-gray-400" />
                <span>{scholarship.scholarshipType}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span>
                  {scholarship.amountMin && scholarship.amountMax
                    ? `$${scholarship.amountMin} - $${scholarship.amountMax}`
                    : 'Not specified'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-gray-400" />
                <span>{scholarship.targetFields?.join(', ') || 'Any field'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{scholarship.targetCountries?.join(', ') || 'Global'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Link to={`/scholarships/${scholarship.id}`} className="flex-1">
              <Button className="w-full">View Full Scholarship</Button>
            </Link>
            {scholarship.applicationURL && (
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => window.open(scholarship.applicationURL, '_blank')}
              >
                Apply Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}