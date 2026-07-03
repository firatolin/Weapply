import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScholarshipFiltersProps {
  onApplyFilters: (filters: any) => void;
  onClearFilters: () => void;
  activeFilters: any;
  activeFilterCount?: number;
}

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 
  'Germany', 'France', 'Netherlands', 'Sweden', 'Norway', 
  'Denmark', 'Finland', 'Italy', 'Spain', 'Switzerland', 
  'Japan', 'South Korea', 'Singapore', 'China', 'India',
  'Brazil', 'Mexico', 'South Africa', 'Kenya', 'Nigeria',
  'Ethiopia', 'Ghana', 'Rwanda', 'Egypt', 'UAE',
  'Saudi Arabia', 'Qatar', 'Malaysia', 'New Zealand',
  'Ireland', 'Belgium', 'Austria', 'Poland', 'Czech Republic'
];

const CONTINENTS = [
  { label: 'North America', value: 'NORTH_AMERICA' },
  { label: 'Europe', value: 'EUROPE' },
  { label: 'Asia', value: 'ASIA' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'Australia & Oceania', value: 'AUSTRALIA' },
  { label: 'Africa', value: 'AFRICA' },
  { label: 'South America', value: 'SOUTH_AMERICA' },
];

const SCHOLARSHIP_TYPES = [
  { label: 'Full Scholarship', value: 'FULL' },
  { label: 'Partial Scholarship', value: 'PARTIAL' },
  { label: 'Merit-Based', value: 'MERIT_BASED' },
  { label: 'Need-Based', value: 'NEED_BASED' },
  { label: 'Research Scholarship', value: 'RESEARCH' },
  { label: 'Diversity Scholarship', value: 'DIVERSITY' },
];

const FIELDS_OF_STUDY = [
  'Computer Science', 'Engineering', 'Data Science', 'Artificial Intelligence',
  'Business Administration', 'Economics', 'Finance', 'Marketing',
  'Medicine', 'Public Health', 'Nursing', 'Pharmacy',
  'Law', 'International Relations', 'Political Science',
  'Education', 'Psychology', 'Sociology', 'Anthropology',
  'Environmental Science', 'Physics', 'Chemistry', 'Biology',
  'Mathematics', 'Statistics', 'Architecture', 'Design',
  'Communications', 'Journalism', 'Media Studies', 'Film',
  'Music', 'Fine Arts', 'Photography', 'Creative Writing'
];

const EDUCATION_LEVELS = [
  { label: 'High School', value: 'HIGH_SCHOOL' },
  { label: "Bachelor's Degree", value: 'BACHELORS' },
  { label: "Master's Degree", value: 'MASTERS' },
  { label: 'PhD/Doctorate', value: 'PHD' },
];

const ENGLISH_PROFICIENCY = [
  { label: 'IELTS', value: 'IELTS' },
  { label: 'TOEFL', value: 'TOEFL' },
  { label: 'PTE Academic', value: 'PTE' },
  { label: 'Duolingo', value: 'DUOLINGO' },
  { label: 'Cambridge English', value: 'CAMBRIDGE' },
];

export function ScholarshipFilters({ 
  onApplyFilters, 
  onClearFilters, 
  activeFilters,
  activeFilterCount = 0 
}: ScholarshipFiltersProps) {
  const [filters, setFilters] = useState<any>({
    country: [],
    continent: [],
    universityCountry: [],
    scholarshipType: [],
    field: [],
    englishProficiency: [],
    educationLevel: [],
    minAmount: '',
    maxAmount: '',
    minGpa: '',
    minWorkExperience: '',
    recentlyPosted: false,
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    location: true,
    scholarship: true,
    finances: true,
    requirements: true,
  });

  useEffect(() => {
    if (activeFilters && Object.keys(activeFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...activeFilters }));
    }
  }, [activeFilters]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCheckboxChange = (key: string, value: string) => {
    setFilters((prev: any) => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleInputChange = (key: string, value: string) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    const cleanedFilters: any = {};
    Object.keys(filters).forEach(key => {
      if (Array.isArray(filters[key]) && filters[key].length > 0) {
        cleanedFilters[key] = filters[key];
      } else if (typeof filters[key] === 'string' && filters[key].trim() !== '') {
        cleanedFilters[key] = filters[key];
      } else if (typeof filters[key] === 'boolean' && filters[key] === true) {
        cleanedFilters[key] = filters[key];
      }
    });
    onApplyFilters(cleanedFilters);
  };

  const handleClear = () => {
    const emptyFilters = {
      country: [],
      continent: [],
      universityCountry: [],
      scholarshipType: [],
      field: [],
      englishProficiency: [],
      educationLevel: [],
      minAmount: '',
      maxAmount: '',
      minGpa: '',
      minWorkExperience: '',
      recentlyPosted: false,
    };
    setFilters(emptyFilters);
    onClearFilters();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Refine your scholarship search
              </SheetDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-20">
          {/* Location Section */}
          <div>
            <button
              onClick={() => toggleSection('location')}
              className="flex items-center justify-between w-full text-left font-semibold text-lg"
            >
              <span>📍 Location</span>
              {expandedSections.location ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.location && (
              <div className="mt-3 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Continent</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {CONTINENTS.map((continent) => (
                      <label key={continent.value} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={filters.continent.includes(continent.value)}
                          onCheckedChange={() => handleCheckboxChange('continent', continent.value)}
                        />
                        <span>{continent.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Country</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto">
                    {COUNTRIES.map((country) => (
                      <label key={country} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={filters.country.includes(country)}
                          onCheckedChange={() => handleCheckboxChange('country', country)}
                        />
                        <span>{country}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Country of University</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto">
                    {COUNTRIES.map((country) => (
                      <label key={country} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={filters.universityCountry.includes(country)}
                          onCheckedChange={() => handleCheckboxChange('universityCountry', country)}
                        />
                        <span>{country}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scholarship Type Section */}
          <div>
            <button
              onClick={() => toggleSection('scholarship')}
              className="flex items-center justify-between w-full text-left font-semibold text-lg"
            >
              <span>🎓 Scholarship Type</span>
              {expandedSections.scholarship ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.scholarship && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SCHOLARSHIP_TYPES.map((type) => (
                  <label key={type.value} className="flex items-center space-x-2 text-sm">
                    <Checkbox
                      checked={filters.scholarshipType.includes(type.value)}
                      onCheckedChange={() => handleCheckboxChange('scholarshipType', type.value)}
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Finances Section */}
          <div>
            <button
              onClick={() => toggleSection('finances')}
              className="flex items-center justify-between w-full text-left font-semibold text-lg"
            >
              <span>💰 Finances</span>
              {expandedSections.finances ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.finances && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Min Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minAmount}
                    onChange={(e) => handleInputChange('minAmount', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Max Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="100000"
                    value={filters.maxAmount}
                    onChange={(e) => handleInputChange('maxAmount', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Requirements Section */}
          <div>
            <button
              onClick={() => toggleSection('requirements')}
              className="flex items-center justify-between w-full text-left font-semibold text-lg"
            >
              <span>📋 Requirements</span>
              {expandedSections.requirements ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.requirements && (
              <div className="mt-3 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Fields of Study</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto">
                    {FIELDS_OF_STUDY.map((field) => (
                      <label key={field} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={filters.field.includes(field)}
                          onCheckedChange={() => handleCheckboxChange('field', field)}
                        />
                        <span>{field}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Education Level</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {EDUCATION_LEVELS.map((level) => (
                      <label key={level.value} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={filters.educationLevel.includes(level.value)}
                          onCheckedChange={() => handleCheckboxChange('educationLevel', level.value)}
                        />
                        <span>{level.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">English Proficiency</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {ENGLISH_PROFICIENCY.map((test) => (
                      <label key={test.value} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={filters.englishProficiency.includes(test.value)}
                          onCheckedChange={() => handleCheckboxChange('englishProficiency', test.value)}
                        />
                        <span>{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Minimum GPA (0-4.0)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    placeholder="e.g. 3.0"
                    value={filters.minGpa}
                    onChange={(e) => handleInputChange('minGpa', e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm">Minimum Work Experience (years)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    value={filters.minWorkExperience}
                    onChange={(e) => handleInputChange('minWorkExperience', e.target.value)}
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm">
                    <Checkbox
                      checked={filters.recentlyPosted}
                      onCheckedChange={(checked) => {
                        setFilters((prev: any) => ({ ...prev, recentlyPosted: checked === true }));
                      }}
                    />
                    <span>Recently Posted (Last 30 days)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleClear}>
              Clear All
            </Button>
            <SheetClose asChild>
              <Button className="flex-1" onClick={handleApply}>
                Apply Filters
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}