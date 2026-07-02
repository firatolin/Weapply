import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, GraduationCap, MapPin, DollarSign, Briefcase, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/client';

interface ProfileData {
  firstName: string;
  lastName: string;
  nationality: string;
  countryOfResidence: string;
  educationLevel: string;
  gpa: string;
  fieldsOfInterest: string;
  targetCountries: string;
  budgetMin: string;
  budgetMax: string;
  skills: string;
  careerGoal: string;
  interests: string;
}

export function ProfileEditPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    nationality: '',
    countryOfResidence: '',
    educationLevel: '',
    gpa: '',
    fieldsOfInterest: '',
    targetCountries: '',
    budgetMin: '',
    budgetMax: '',
    skills: '',
    careerGoal: '',
    interests: '',
  });

  // Fetch existing profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await apiClient.get('/users/profile');
      return response.data.data;
    },
    enabled: !!user,
    retry: false,
  });

  // Load profile data when available
  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        nationality: profileData.nationality || '',
        countryOfResidence: profileData.countryOfResidence || '',
        educationLevel: profileData.educationLevel || '',
        gpa: profileData.gpa || '',
        fieldsOfInterest: profileData.fieldsOfInterest?.join(', ') || '',
        targetCountries: profileData.targetCountries?.join(', ') || '',
        budgetMin: profileData.budgetRange?.min?.toString() || '',
        budgetMax: profileData.budgetRange?.max?.toString() || '',
        skills: profileData.skills?.join(', ') || '',
        careerGoal: profileData.careerGoal || '',
        interests: profileData.interests?.join(', ') || '',
      });
    }
  }, [profileData]);

  // Save profile mutation
  const saveProfile = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.put('/users/profile', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profile saved successfully! 🎉');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      navigate('/matches');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save profile');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      nationality: formData.nationality,
      countryOfResidence: formData.countryOfResidence,
      educationLevel: formData.educationLevel,
      gpa: formData.gpa ? parseFloat(formData.gpa) : null,
      fieldsOfInterest: formData.fieldsOfInterest.split(',').map((s) => s.trim()).filter(Boolean),
      targetCountries: formData.targetCountries.split(',').map((s) => s.trim()).filter(Boolean),
      budgetRange: {
        min: formData.budgetMin ? parseFloat(formData.budgetMin) : 0,
        max: formData.budgetMax ? parseFloat(formData.budgetMax) : 100000,
      },
      skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
      careerGoal: formData.careerGoal,
      interests: formData.interests.split(',').map((s) => s.trim()).filter(Boolean),
    };

    saveProfile.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <User className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Complete Your Profile</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Fill in your details to get personalized scholarship matches. The more information you provide, the better your matches will be.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Tell us about yourself</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Nationality & Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  placeholder="e.g. Ethiopian, American"
                />
              </div>
              <div>
                <Label htmlFor="countryOfResidence">Country of Residence</Label>
                <Input
                  id="countryOfResidence"
                  name="countryOfResidence"
                  value={formData.countryOfResidence}
                  onChange={handleChange}
                  placeholder="e.g. US, UK, Ethiopia"
                />
              </div>
            </div>

            {/* Education */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="educationLevel">Education Level</Label>
                <Select
                  value={formData.educationLevel}
                  onValueChange={(value) => handleSelectChange('educationLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                    <SelectItem value="BACHELORS">Bachelor's Degree</SelectItem>
                    <SelectItem value="MASTERS">Master's Degree</SelectItem>
                    <SelectItem value="PHD">PhD/Doctorate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gpa">GPA (0-4.0)</Label>
                <Input
                  id="gpa"
                  name="gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={formData.gpa}
                  onChange={handleChange}
                  placeholder="e.g. 3.5"
                />
              </div>
            </div>

            {/* Fields of Interest */}
            <div>
              <Label htmlFor="fieldsOfInterest">Fields of Interest</Label>
              <Input
                id="fieldsOfInterest"
                name="fieldsOfInterest"
                value={formData.fieldsOfInterest}
                onChange={handleChange}
                placeholder="Computer Science, Data Science, Engineering"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
            </div>

            {/* Target Countries */}
            <div>
              <Label htmlFor="targetCountries">Target Countries for Study</Label>
              <Input
                id="targetCountries"
                name="targetCountries"
                value={formData.targetCountries}
                onChange={handleChange}
                placeholder="US, UK, Canada, Germany"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budgetMin">Minimum Budget ($)</Label>
                <Input
                  id="budgetMin"
                  name="budgetMin"
                  type="number"
                  value={formData.budgetMin}
                  onChange={handleChange}
                  placeholder="e.g. 0"
                />
              </div>
              <div>
                <Label htmlFor="budgetMax">Maximum Budget ($)</Label>
                <Input
                  id="budgetMax"
                  name="budgetMax"
                  type="number"
                  value={formData.budgetMax}
                  onChange={handleChange}
                  placeholder="e.g. 50000"
                />
              </div>
            </div>

            {/* Skills */}
            <div>
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="Python, Leadership, Research, Communication"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
            </div>

            {/* Career Goal */}
            <div>
              <Label htmlFor="careerGoal">Career Goal</Label>
              <Input
                id="careerGoal"
                name="careerGoal"
                value={formData.careerGoal}
                onChange={handleChange}
                placeholder="e.g. Software Engineer, Data Scientist"
              />
            </div>

            {/* Interests */}
            <div>
              <Label htmlFor="interests">Interests</Label>
              <Input
                id="interests"
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                placeholder="AI, Sustainability, Entrepreneurship"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Save & Find Matches
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}