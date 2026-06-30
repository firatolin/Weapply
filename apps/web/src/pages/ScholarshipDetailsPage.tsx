import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getScholarshipById, Scholarship } from '../api/scholarships';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  DollarSign,
  Globe,
  Users,
  BookOpen,
  Award,
  Building,
  CheckCircle,
  Clock,
  Mail,
  MapPin,
  FileText,
  Tag,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ScholarshipDetailsPage() {
  // Get the ID from the URL
  const { id } = useParams<{ id: string }>();

  // Fetch the scholarship details
  const {
    data: scholarship,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['scholarship', id],
    queryFn: () => getScholarshipById(id!),
    enabled: !!id, // Only run if we have an ID
  });

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return `$${amount.toLocaleString()}`;
  };

  // Get badge color based on type
  const getBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      FULL: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      MERIT_BASED: 'bg-blue-100 text-blue-800',
      NEED_BASED: 'bg-purple-100 text-purple-800',
      RESEARCH: 'bg-indigo-100 text-indigo-800',
      DIVERSITY: 'bg-pink-100 text-pink-800',
      UNIVERSITY: 'bg-red-100 text-red-800',
      GOVERNMENT: 'bg-orange-100 text-orange-800',
      PRIVATE: 'bg-teal-100 text-teal-800',
      NGO: 'bg-cyan-100 text-cyan-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error || !scholarship) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link to="/scholarships">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Scholarships
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500 text-lg">Failed to load scholarship details</p>
            <Button onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link to="/scholarships">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Scholarships
        </Button>
      </Link>

      {/* Main Scholarship Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <CardTitle className="text-3xl">{scholarship.name}</CardTitle>
              <CardDescription className="text-lg mt-2">
                <Building className="inline h-4 w-4 mr-1" />
                {scholarship.provider}
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className={getBadgeColor(scholarship.providerType)}>
                {scholarship.providerType}
              </Badge>
              <Badge className={getBadgeColor(scholarship.scholarshipType)}>
                {scholarship.scholarshipType}
              </Badge>
              {scholarship.isVerified && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-gray-700">{scholarship.description || 'No description available'}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Amount</p>
                  <p className="text-gray-700">
                    {scholarship.amountMin && scholarship.amountMax
                      ? `${formatCurrency(scholarship.amountMin)} - ${formatCurrency(scholarship.amountMax)}`
                      : 'Amount not specified'}
                  </p>
                  <p className="text-sm text-gray-500">Currency: {scholarship.amountCurrency}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Application Deadline</p>
                  <p className="text-gray-700">{formatDate(scholarship.applicationDeadline)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Eligible Countries</p>
                  <p className="text-gray-700">
                    {scholarship.targetCountries.length > 0
                      ? scholarship.targetCountries.join(', ')
                      : 'All countries'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Eligible Nationalities</p>
                  <p className="text-gray-700">
                    {scholarship.targetNationalities.length > 0
                      ? scholarship.targetNationalities.join(', ')
                      : 'All nationalities'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Fields of Study</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {scholarship.targetFields.length > 0 ? (
                      scholarship.targetFields.map((field) => (
                        <Badge key={field} variant="outline" className="text-sm">
                          {field}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500">No specific fields</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Education Levels</p>
                  <p className="text-gray-700">
                    {scholarship.educationLevels.length > 0
                      ? scholarship.educationLevels.join(', ')
                      : 'All levels'}
                  </p>
                </div>
              </div>

              {scholarship.applicationFee !== null && scholarship.applicationFee !== undefined && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Application Fee</p>
                    <p className="text-gray-700">
                      {scholarship.applicationFee > 0 ? `$${scholarship.applicationFee}` : 'Free'}
                    </p>
                  </div>
                </div>
              )}

              {scholarship.requiredDocuments && scholarship.requiredDocuments.length > 0 && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Required Documents</p>
                    <ul className="list-disc list-inside text-gray-700">
                      {scholarship.requiredDocuments.map((doc) => (
                        <li key={doc}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Essay Prompt (if exists) */}
          {scholarship.essayPrompt && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium mb-2">Essay Prompt</h4>
              <p className="text-gray-700">{scholarship.essayPrompt}</p>
            </div>
          )}

          {/* Tags */}
          {scholarship.tags && scholarship.tags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {scholarship.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" /> {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 pt-4 border-t flex gap-6 text-sm text-gray-500">
            <span>👁️ {scholarship.viewCount || 0} views</span>
            <span>📅 Updated: {new Date(scholarship.updatedAt).toLocaleDateString()}</span>
            <span>📅 Created: {new Date(scholarship.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Apply Button */}
          <div className="mt-6 flex gap-4">
            {scholarship.applicationURL && (
              <Button
                className="flex-1"
                size="lg"
                onClick={() => window.open(scholarship.applicationURL, '_blank')}
              >
                Apply Now <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
            <Button variant="outline" size="lg" className="flex-1">
              Save to Favorites
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About the Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-gray-700">
            <p>
              <strong>Provider:</strong> {scholarship.provider}
            </p>
            <p>
              <strong>Type:</strong> {scholarship.providerType}
            </p>
            <p>
              <strong>Status:</strong> {scholarship.isVerified ? '✅ Verified' : '⏳ Unverified'}
            </p>
            <p>
              <strong>Source:</strong> {scholarship.source}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
