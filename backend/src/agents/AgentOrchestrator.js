import BugDetectionAgent from './BugDetectionAgent.js';
import SecurityAgent from './SecurityAgent.js';
import PerformanceAgent from './PerformanceAgent.js';
import StyleAgent from './StyleAgent.js';


class AgentOrchestrator {
    constructor() {
        this.agents = [
            new BugDetectionAgent(),
            new PerformanceAgent(),
            new StyleAgent(),
            new SecurityAgent(),
        ];
    }

    /**
     * Run all agents in parallel
     * @param {string} code - The code to analyze
     * @param {string} language - The language of the code
     * @returns {Promise<Array>} - Array of analysis results
     */
    async analyzeCode(code, language) {
        console.log('Start multi-agent analysis...');
        const startTime = Date.now();

        try {
            // Execute all agents in parallel
            const agentPromises = this.agents.map(agent => agent.analyze(code, language));

            // Wait for all agents to complete
            const results = await Promise.all(agentPromises);

            const endTime = Date.now();
            const totalDuration = endTime - startTime;

            const aggregated = this.aggregateResults(results, totalDuration);

            console.log('Analysis completed in', totalDuration, 'ms');

            return aggregated;
        } catch (error) {
            console.error('Error analyzing code:', error);
            throw error;
        }
    }

    /**
     * Aggregate results from all agents
     */
    aggregateResults(results, totalDuration) {
        const successful = results.filter(r => !r.error);
        const failed = results.filter(r => r.error);

        const issuesBySeverity = { high: 0, medium: 0, low: 0 };
        const allIssues = [];

        successful.forEach(result => {
            if (result.findings && result.findings.issues) {
                result.findings.issues.forEach(issue => {
                    issuesBySeverity[issue.severity]++;
                    allIssues.push({
                        ...issue,
                        agent: result.agentName,
                        specialty: result.specialty
                    });
                });
            }
        });

        const scores = successful
        .filter(r => r.findings && r.findings.score)
        .map(r => r.findings.score);

        const overallScore = scores.length > 0
        ?  Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

        // Calculate total tokens and cost
        const totalTokens = successful.reduce((sum, r) => sum + r.tokensUsed, 0);
        const estimatedCost = this.calculateCost(totalTokens);

        return {
            success: true,
            overallScore,
            totalIssuesFound: allIssues.length,
            issuesBySeverity,
            agentResults: successful, 
            failedAgents: failed,
            allIssues,
            metrics: {
                totalDuration,
                agentsRun: successful.length,
                totalTokens,
                estimatedCost
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calculate estimated cost based on tokens
     */
    calculateCost(totalTokens) {
        const costPerMillionTokens = 0.375;
        return ((totalTokens/ 1000000) * costPerMillionTokens).toFixed(6);
    }

}

export default AgentOrchestrator;