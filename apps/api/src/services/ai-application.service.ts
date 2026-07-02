import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class AIApplicationService {
  /**
   * Analyze application quality using AI
   */
  static async analyzeApplication(application: any): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    overallAssessment: string;
  }> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `
        You are an expert scholarship application reviewer. Analyze this application and provide feedback.

        APPLICATION:
        - Full Name: ${application.fullName}
        - Email: ${application.email}
        - Education: ${application.currentEducation || 'Not specified'}
        - Institution: ${application.currentInstitution || 'Not specified'}
        - GPA: ${application.gpa || 'Not specified'}
        - Cover Letter: ${application.coverLetter || 'Not provided'}
        - Additional Info: ${application.additionalInfo || 'Not provided'}

        Provide a JSON response with:
        1. score: 0-100 application quality score
        2. strengths: ["Strength 1", "Strength 2", ...]
        3. weaknesses: ["Weakness 1", "Weakness 2", ...]
        4. suggestions: ["Suggestion 1", "Suggestion 2", ...]
        5. overallAssessment: "Overall assessment text"

        Return ONLY valid JSON.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return JSON.parse(response);
    } catch (error) {
      console.error('❌ AI analysis error:', error);
      return {
        score: 50,
        strengths: ['Application submitted'],
        weaknesses: ['AI analysis unavailable'],
        suggestions: ['Complete all fields for better assessment'],
        overallAssessment: 'Unable to analyze application. Please review manually.',
      };
    }
  }
}