import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createScholarship } from '../api/scholarships';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Validation schema - UPDATED
const scholarshipSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  provider: z.string().min(2, 'Provider is required'),
  providerType: z.enum(['UNIVERSITY', 'GOVERNMENT', 'PRIVATE', 'NGO', 'OTHER']),
  scholarshipType: z.enum(['FULL', 'PARTIAL', 'MERIT_BASED', 'NEED_BASED', 'RESEARCH', 'DIVERSITY']),
  amountMin: z.coerce.number().positive().optional(),
  amountMax: z.coerce.number().positive().optional(),
  applicationDeadline: z.string().optional(),
  applicationURL: z.string().url('Please enter a valid URL').optional().or(z.literal('')).or(z.null()),
  targetFields: z.string().optional(),
  targetCountries: z.string().optional(),
  targetNationalities: z.string().optional(),
  educationLevels: z.string().optional(),
  tags: z.string().optional(),
});

type ScholarshipFormValues = z.infer<typeof scholarshipSchema>;

export function CreateScholarshipPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<ScholarshipFormValues>({
    resolver: zodResolver(scholarshipSchema),
    defaultValues: {
      name: '',
      description: '',
      provider: '',
      providerType: 'NGO',
      scholarshipType: 'FULL',
      amountMin: undefined,
      amountMax: undefined,
      applicationDeadline: '',
      applicationURL: '',
      targetFields: '',
      targetCountries: '',
      targetNationalities: '',
      educationLevels: '',
      tags: '',
    },
  });

  const onSubmit = async (data: ScholarshipFormValues) => {
    setLoading(true);
    try {
      const formattedData = {
        name: data.name,
        description: data.description || undefined,
        provider: data.provider,
        providerType: data.providerType,
        scholarshipType: data.scholarshipType,
        amountMin: data.amountMin ? parseFloat(String(data.amountMin)) : undefined,
        amountMax: data.amountMax ? parseFloat(String(data.amountMax)) : undefined,
        amountCurrency: 'USD',
        applicationDeadline: data.applicationDeadline
          ? new Date(data.applicationDeadline).toISOString()
          : undefined,
        applicationURL: data.applicationURL && data.applicationURL.trim() !== '' ? data.applicationURL : undefined,
        targetFields: data.targetFields?.split(',').map((s) => s.trim()).filter(Boolean) || [],
        targetCountries: data.targetCountries?.split(',').map((s) => s.trim()).filter(Boolean) || [],
        targetNationalities: data.targetNationalities?.split(',').map((s) => s.trim()).filter(Boolean) || [],
        educationLevels: data.educationLevels?.split(',').map((s) => s.trim()).filter(Boolean) || [],
        tags: data.tags?.split(',').map((s) => s.trim()).filter(Boolean) || [],
      };

      await createScholarship(formattedData);
      toast.success('Scholarship created successfully! 🎉');
      navigate('/scholarships');
    } catch (error: any) {
      console.error('Error creating scholarship:', error);
      toast.error(error.message || 'Failed to create scholarship');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/scholarships">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Scholarships
        </Button>
      </Link>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Scholarship</CardTitle>
          <CardDescription>
            Enter the details of the scholarship you want to add to the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scholarship Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Global Excellence Scholarship 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Provider */}
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. World Education Foundation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Provider Type */}
                <FormField
                  control={form.control}
                  name="providerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UNIVERSITY">University</SelectItem>
                          <SelectItem value="GOVERNMENT">Government</SelectItem>
                          <SelectItem value="PRIVATE">Private</SelectItem>
                          <SelectItem value="NGO">NGO</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Scholarship Type */}
                <FormField
                  control={form.control}
                  name="scholarshipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scholarship Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FULL">Full</SelectItem>
                          <SelectItem value="PARTIAL">Partial</SelectItem>
                          <SelectItem value="MERIT_BASED">Merit Based</SelectItem>
                          <SelectItem value="NEED_BASED">Need Based</SelectItem>
                          <SelectItem value="RESEARCH">Research</SelectItem>
                          <SelectItem value="DIVERSITY">Diversity</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the scholarship, eligibility criteria, and benefits..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount Min */}
                <FormField
                  control={form.control}
                  name="amountMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount Max */}
                <FormField
                  control={form.control}
                  name="amountMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Application Deadline */}
                <FormField
                  control={form.control}
                  name="applicationDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Deadline</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Application URL - UPDATED with better placeholder */}
                <FormField
                  control={form.control}
                  name="applicationURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/apply (optional)" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>Leave empty if not available</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Eligibility & Requirements</h3>
                <p className="text-sm text-muted-foreground">
                  Enter comma-separated values for each field.
                </p>

                {/* Target Fields */}
                <FormField
                  control={form.control}
                  name="targetFields"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Fields of Study</FormLabel>
                      <FormControl>
                        <Input placeholder="Computer Science, Engineering, Data Science" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Target Countries */}
                <FormField
                  control={form.control}
                  name="targetCountries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Countries</FormLabel>
                      <FormControl>
                        <Input placeholder="US, UK, Germany, Canada" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of country codes</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Target Nationalities */}
                <FormField
                  control={form.control}
                  name="targetNationalities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Nationalities</FormLabel>
                      <FormControl>
                        <Input placeholder="US, GB, ET, IN" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of country codes</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Education Levels */}
                <FormField
                  control={form.control}
                  name="educationLevels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education Levels</FormLabel>
                      <FormControl>
                        <Input placeholder="BACHELORS, MASTERS, PHD" {...field} />
                      </FormControl>
                      <FormDescription>
                        Comma-separated: HIGH_SCHOOL, BACHELORS, MASTERS, PHD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tags */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="stem, merit-based, international" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated tags for better search</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Scholarship'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/scholarships')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}