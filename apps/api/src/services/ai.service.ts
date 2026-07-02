import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { config } from '../config/index.js';

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    const apiKey = config.GEMINI_API_KEY;
    const modelName = config.GEMINI_MODEL || 'gemini-2.5-flash';
  
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      console.warn('⚠️ GEMINI_API_KEY not found. AI features will be disabled.');
      this.genAI = new GoogleGenerativeAI('dummy-key');
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } else {
      console.log(`🤖 Initializing Gemini AI with model: ${modelName}`);
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: modelName });
    }
  }

  /**
   * Get semantic match score between user profile and scholarship
   */
  async getSemanticMatchScore(profile: any, scholarship: any): Promise<{
    score: number;
    reasoning: string;
    fieldMatch: number;
    educationMatch: number;
    countryMatch: number;
    financialFit: number;
    suggestions: string[];
  }> {
    try {
      console.log(`🤖 AI matching: ${scholarship.name}...`);
      
      const prompt = this.buildMatchPrompt(profile, scholarship);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse the JSON response
      const parsed = this.extractJSON(response);
      
      console.log(`✅ AI match score: ${parsed.score}% for ${scholarship.name}`);
      
      return {
        score: parsed.score || 50,
        reasoning: parsed.reasoning || 'AI analysis complete',
        fieldMatch: parsed.fieldMatch || 0,
        educationMatch: parsed.educationMatch || 0,
        countryMatch: parsed.countryMatch || 0,
        financialFit: parsed.financialFit || 0,
        suggestions: parsed.suggestions || ['Complete your profile for better matches'],
      };
    } catch (error) {
      console.error(`❌ AI matching error for ${scholarship.name}:`, error);
      return this.fallbackMatch(profile, scholarship);
    }
  }

  /**
   * Build the AI prompt for matching
   */
  private buildMatchPrompt(profile: any, scholarship: any): string {
    return `
You are an expert scholarship matching assistant. Your task is to analyze how well a student matches a scholarship.

STUDENT PROFILE:
- Fields of Interest: ${profile.fieldsOfInterest?.join(', ') || 'Not specified'}
- Education Level: ${profile.educationLevel || 'Not specified'}
- GPA: ${profile.gpa || 'Not specified'}
- Country: ${profile.countryOfResidence || 'Not specified'}
- Skills: ${profile.skills?.join(', ') || 'Not specified'}
- Career Goal: ${profile.careerGoal || 'Not specified'}
- Budget: ${profile.budgetRange ? `$${profile.budgetRange.min} - $${profile.budgetRange.max}` : 'Not specified'}

SCHOLARSHIP:
- Name: ${scholarship.name}
- Provider: ${scholarship.provider}
- Description: ${scholarship.description || 'No description'}
- Type: ${scholarship.scholarshipType}
- Fields: ${scholarship.targetFields?.join(', ') || 'All fields welcome'}
- Countries: ${scholarship.targetCountries?.join(', ') || 'All countries'}
- Education Levels: ${scholarship.educationLevels?.join(', ') || 'All levels'}
- Amount: ${scholarship.amountMin ? `$${scholarship.amountMin} - $${scholarship.amountMax}` : 'Not specified'}

Analyze the match and return a JSON response with:
{
  "score": (number 0-100, overall match percentage),
  "reasoning": (string, brief explanation of why this is a good or bad match),
  "fieldMatch": (number 0-100, how well fields align),
  "educationMatch": (number 0-100, how well education levels align),
  "countryMatch": (number 0-100, how well country eligibility aligns),
  "financialFit": (number 0-100, how well budget and scholarship amount align),
  "suggestions": (array of strings, 2-3 suggestions to improve match)
}

Return ONLY valid JSON. No markdown, no explanation.
`;
  }

  /**
   * Extract JSON from AI response
   */
  private extractJSON(text: string): any {
    try {
      // Try to parse directly
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // Try to find JSON object in text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      throw new Error('Could not extract JSON');
    }
  }

  /**
   * Fallback matching when AI fails
   */
  private fallbackMatch(profile: any, scholarship: any): any {
    console.log('📊 Using fallback matching for:', scholarship.name);
    
    let score = 50;
    const reasoning = [];
    let fieldMatch = 50;
    let educationMatch = 50;
    let countryMatch = 50;
    let financialFit = 50;

    // Check field match
    const profileFields = profile.fieldsOfInterest || [];
    const scholarshipFields = scholarship.targetFields || [];
    if (profileFields.length > 0 && scholarshipFields.length > 0) {
      const overlap = profileFields.filter((f: string) => 
        scholarshipFields.some((sf: string) => 
          sf.toLowerCase().includes(f.toLowerCase()) || 
          f.toLowerCase().includes(sf.toLowerCase())
        )
      );
      if (overlap.length > 0) {
        const matchPercent = (overlap.length / Math.max(profileFields.length, scholarshipFields.length)) * 100;
        fieldMatch = Math.round(matchPercent);
        reasoning.push(`Fields overlap: ${overlap.join(', ')}`);
      }
    }

    // Check education
    if (profile.educationLevel && scholarship.educationLevels?.includes(profile.educationLevel)) {
      educationMatch = 100;
      reasoning.push('Education level matches');
    }

    // Check country
    if (profile.countryOfResidence && scholarship.targetCountries?.includes(profile.countryOfResidence)) {
      countryMatch = 100;
      reasoning.push('Country eligibility matches');
    } else if (scholarship.targetCountries?.includes('Global') || scholarship.targetCountries?.includes('All')) {
      countryMatch = 80;
      reasoning.push('Global scholarship - your country is likely eligible');
    }

    // Check financial
    const budgetMax = profile.budgetRange?.max || 100000;
    const scholarshipAmount = scholarship.amountMin || 0;
    if (scholarshipAmount > 0 && scholarshipAmount <= budgetMax) {
      financialFit = 100;
      reasoning.push('Fits within your budget');
    } else if (scholarshipAmount > 0 && scholarshipAmount <= budgetMax * 1.5) {
      financialFit = 70;
      reasoning.push('Slightly above your budget but manageable');
    }

    // Calculate overall score
    score = Math.round((fieldMatch + educationMatch + countryMatch + financialFit) / 4);
    
    if (score < 30) {
      reasoning.push('Consider updating your profile for better matches');
    }

    return {
      score: Math.min(score, 100),
      reasoning: reasoning.join('. ') || 'Standard match based on basic criteria',
      fieldMatch,
      educationMatch,
      countryMatch,
      financialFit,
      suggestions: [
        'Complete your profile for better AI matching',
        'Add more skills and interests',
        'Update your budget range if needed'
      ],
    };
  }
}

export default new AIService();