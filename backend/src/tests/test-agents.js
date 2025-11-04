import dotenv from 'dotenv';
dotenv.config();

import AgentOrchestrator from '../agents/AgentOrchestrator.js';
import { logger } from '../utils/logger.js';


// Sample buggy code to test
const testCode = `
function calculateTotal(items) {
  let total = 0;
  // Bug: Off-by-one error (should be i < items.length)
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}

function getUserData(userId) {
  // Security: SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userId;
  return db.execute(query);
}

function findUser(users, targetId) {
  // Performance: O(n) search, could use Map for O(1)
  for (let i = 0; i < users.length; i++) {
    if (users[i].id === targetId) {
      return users[i];
    }
  }
  return null;
}

function processPayment(amount) {
  // Style: Magic number, no error handling
  if (amount > 100) {
    console.log("Processing payment");
    // TODO: implement payment logic
  }
}

function divide(a, b) {
  // Bug: No division by zero check
  return a / b;
}
`;

async function testAgents() {
  logger.info(`
╔════════════════════════════════════════════════════════╗
║  🧪 TESTING MULTI-AGENT SYSTEM                        ║
╚════════════════════════════════════════════════════════╝
  `);

  try {
    const orchestrator = new AgentOrchestrator();
    
    logger.info('Running agents on test code...\n');
    
    const results = await orchestrator.analyzeCode(testCode, 'javascript');

    // Display results
    logger.info(`
╔════════════════════════════════════════════════════════╗
║  📊 ANALYSIS RESULTS                                  ║
╚════════════════════════════════════════════════════════╝
    `);

    logger.success(`✅ Analysis completed successfully!`);
    logger.info(`\n📈 Overall Score: ${results.overallScore}/100`);
    logger.info(`🐛 Total Issues Found: ${results.totalIssuesFound}`);
    logger.info(`\n📊 Issues by Severity:`);
    logger.info(`   🔴 High:   ${results.issuesBySeverity.high}`);
    logger.info(`   🟡 Medium: ${results.issuesBySeverity.medium}`);
    logger.info(`   🟢 Low:    ${results.issuesBySeverity.low}`);
    
    logger.info(`\n💰 Metrics:`);
    logger.info(`   ⏱️  Duration: ${results.metrics.totalDuration}ms`);
    logger.info(`   🤖 Agents Run: ${results.metrics.agentsRun}`);
    logger.info(`   🎫 Tokens Used: ${results.metrics.totalTokens}`);
    logger.info(`   💵 Estimated Cost: $${results.metrics.estimatedCost}`);

    // Display each agent's findings
    logger.info(`\n🔍 Agent Results:\n`);
    
    results.agentResults.forEach((agentResult, index) => {
      const emoji = ['🐛', '🔒', '⚡', '🎨'][index] || '🤖';
      logger.info(`${emoji} ${agentResult.agentName} (${agentResult.specialty})`);
      logger.info(`   Score: ${agentResult.findings.score}/100`);
      logger.info(`   Issues: ${agentResult.findings.issues.length}`);
      logger.info(`   Summary: ${agentResult.findings.summary}`);
      logger.info('');
    });

    // Display detailed issues
    logger.info(`\n📋 Detailed Issues:\n`);
    
    results.allIssues.forEach((issue, i) => {
      const severityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
      }[issue.severity];

      logger.info(`${i + 1}. ${severityEmoji} [${issue.severity.toUpperCase()}] Line ${issue.line}`);
      logger.info(`   Agent: ${issue.agent}`);
      logger.info(`   Issue: ${issue.description}`);
      logger.info(`   Fix: ${issue.recommendation}\n`);
    });

    // Check for failed agents
    if (results.failedAgents.length > 0) {
      logger.error(`\n❌ Failed Agents: ${results.failedAgents.length}`);
      results.failedAgents.forEach(agent => {
        logger.error(`   ${agent.agentName}: ${agent.error}`);
      });
    }

    logger.success(`
╔════════════════════════════════════════════════════════╗
║  ✅ TEST COMPLETED SUCCESSFULLY                       ║
╚════════════════════════════════════════════════════════╝
    `);

    return results;

  } catch (error) {
    logger.error(`\n❌ Test failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run test
testAgents();