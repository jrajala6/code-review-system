import OpenAI from 'openai';

class BaseAgent {
    constructor(config) {
        this.name = config.name;
        this.specialty = config.specialty;
        this.systemPrompt = config.systemPrompt;
        this.model = config.model || 'gpt-4o-mini';

        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Main method to analyze code 
     * @param {string} code - The code to analyze
     * @param {string} language - The language of the code
     * @returns {Promise<string>} - Analysis results
     */
    async analyze(code, language) {
        try {
            const startTime = Date.now();

            const userPrompt = this.buildUserPrompt(code, language);

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' },
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            const analysis = JSON.parse(response.choices[0].message.content);

            return {
                agentName: this.name,
                specialty: this.specialty,
                findings: analysis,
                tokensUsed: response.usage.total_tokens,
                duration: duration,
                model: this.model,
                timestamp: new Date().toISOString(),
            };
            
        } catch (error) {
            console.error(`Error analyzing code: ${error.message}`);
            return {
                agentName: this.name,
                specialty: this.specialty,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

     /**
   * Build the user prompt with code
   */
  buildUserPrompt(code, language) {
    return `
Analyze the following ${language} code and provide your findings in JSON format.

Code:
\`\`\`${language}
${code}
\`\`\`

Return your analysis as JSON with this structure:
{
  "issues": [
    {
      "severity": "high|medium|low",
      "line": <line_number>,
      "description": "Clear description of the issue",
      "recommendation": "How to fix it"
    }
  ],
  "summary": "Brief overall assessment",
  "score": <0-100>
}
`;
  }
}

export default BaseAgent;