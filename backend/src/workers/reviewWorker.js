// src/workers/reviewWorker.js
import { reviewQueue } from '../queues/reviewQueue.js';
import { supabase } from '../config/supabase.js';
import { cloneRepository, parseCodeFiles } from '../services/githubService.js';
import { logger } from '../utils/logger.js';
import AgentOrchestrator from '../agents/AgentOrchestrator.js';

// Initialize orchestrator
const orchestrator = new AgentOrchestrator();

// ==============================================
// JOB PROCESSOR
// ==============================================

/**
 * Process a review job
 * This function is called by Bull when a job is picked up
 */
async function processReviewJob(job) {
    const { jobId, repoId } = job.data;
    let cleanup = null;

    try {
        logger.info(`
    ╔════════════════════════════════════════════════════════╗
    ║  🚀 PROCESSING JOB                                    ║
    ║  Job ID: ${jobId.substring(0, 30)}...                ║
    ╚════════════════════════════════════════════════════════╝
        `);
        
        // ==============================================
        // STEP 1: FETCH REPOSITORY FROM DATABASE
        // ==============================================
        const { data: repo, error: repoError } = await supabase
            .from('repositories')
            .select('*')
            .eq('id', repoId)
            .single();

        if (repoError || !repo) {
            throw new Error(`Repository not found: ${repoId}`);
        }
            
        logger.success(`Repository: ${repo.repo_owner}/${repo.repo_name}`);

        // ==============================================
        // STEP 2: UPDATE JOB STATUS TO PROCESSING
        // ==============================================
        
        logger.info(`Updating job status to processing`);

        await updateJobStatus(jobId, {
            status: 'processing',
            started_at: new Date().toISOString()
        });

        await updateRepositoryStatus(repoId, 'cloning');

        job.progress(10);
        
        // ==============================================
        // STEP 3: CLONE REPOSITORY
        // ==============================================
        logger.info(`Cloning repository`);
        
        const cloneResult = await cloneRepository(repo.repo_url, repo.branch);

        cleanup = cloneResult.cleanup;
        logger.success(`Cloned to: ${cloneResult.path}`);

        job.progress(30);

        // ==============================================
        // STEP 4: PARSE CODE FILES
        // ==============================================
        logger.info(`Parsing code files`);
        
        await updateRepositoryStatus(repoId, 'analyzing');

        const files = await parseCodeFiles(cloneResult.path);
        
        logger.success(`Found ${files.length} code files to analyze`);

        const fileSummary = files.reduce((acc, file) => {
            acc[file.language] = (acc[file.language] || 0) + 1;
            return acc;
        }, {});

        logger.info('File breakdown:');
        Object.entries(fileSummary).forEach(([language, count]) => {
            logger.info(`  ${language}: ${count} files`);
        });

        await updateJobStatus(jobId, {
            total_files: files.length,
            processed_files: 0
        });
        
        job.progress(40);

        // ==============================================
        // STEP 5: ANALYZE CODE FILES
        // ==============================================
        logger.info(`Analyzing ${files.length} code files with AI agents...`);

        const analysisResults = [];
        let totalIssues = 0;
        let totalTokens = 0;
        let totalCost = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            logger.info(`[${i + 1}/${files.length}] Analyzing: ${file.path}`);

            // Analyze file with multi-agent system
            const results = await orchestrator.analyzeCode(file.content, file.language);

            if (results.success) {
                analysisResults.push({
                    file: file.path,
                    language: file.language,
                    results: results
                });

                totalIssues += results.totalIssuesFound;
                totalTokens += results.metrics.totalTokens;
                totalCost += parseFloat(results.metrics.estimatedCost);

                logger.success(`  ✓ Found ${results.totalIssuesFound} issues (Score: ${results.overallScore}/100)`);
            } else {
                logger.error(`  ✗ Analysis failed for ${file.path}`);
            }

            // Update progress
            const processed = i + 1;
            const progressPercent = 40 + Math.floor((processed / files.length) * 50);

            await updateJobStatus(jobId, {
                processed_files: processed,
                progress: progressPercent
            });

            job.progress(progressPercent);
        }

        // ==============================================
        // STEP 6: AGGREGATE RESULTS & SAVE TO DATABASE
        // ==============================================
        logger.info(`Aggregating results...`);

        const aggregatedResults = {
            totalFiles: files.length,
            totalIssues: totalIssues,
            totalTokens: totalTokens,
            totalCost: totalCost.toFixed(6),
            fileResults: analysisResults,
            summary: {
                highSeverity: analysisResults.reduce((sum, r) => sum + r.results.issuesBySeverity.high, 0),
                mediumSeverity: analysisResults.reduce((sum, r) => sum + r.results.issuesBySeverity.medium, 0),
                lowSeverity: analysisResults.reduce((sum, r) => sum + r.results.issuesBySeverity.low, 0),
            }
        };

        // Calculate overall repository score
        const avgScore = analysisResults.length > 0
            ? Math.round(analysisResults.reduce((sum, r) => sum + r.results.overallScore, 0) / analysisResults.length)
            : 0;

        // Save results to database
        const { error: resultsError } = await supabase
            .from('review_results')
            .insert({
                job_id: jobId,
                repo_id: repoId,
                results: aggregatedResults,
                overall_score: avgScore,
                total_issues: totalIssues,
                created_at: new Date().toISOString()
            });

        if (resultsError) {
            logger.error(`Failed to save results: ${resultsError.message}`);
            throw resultsError;
        }

        // ==============================================
        // STEP 6.5: SAVE INDIVIDUAL FINDINGS TO REVIEWS TABLE
        // ==============================================
        logger.info(`Saving individual findings to reviews table...`);

        // Get all agent IDs by name (to map agent names to IDs)
        const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('id, name');

        if (agentsError) {
            logger.error(`Failed to fetch agents: ${agentsError.message}`);
            // Don't fail the job, but log the error
        }

        // Create a map of agent name to agent ID
        // Database has names like "performance", "security", "style", "bug" (lowercase)
        // BaseAgent returns names like "Performance Optimizer", "Security Guardian", etc.
        // BaseAgent also provides 'specialty' field which matches database names: 'performance', 'security', 'style', 'bug_detection'
        
        const agentMap = {};
        const specialtyToDbName = {
            'bug_detection': 'bug',
            'performance': 'performance',
            'security': 'security',
            'style': 'style'
        };
        
        // Map database agent names to IDs
        if (agents) {
            agents.forEach(agent => {
                // Map database agent name (lowercase) to ID
                agentMap[agent.name.toLowerCase()] = agent.id;
                // Also map exact name for flexibility
                agentMap[agent.name] = agent.id;
            });
            logger.info(`Loaded ${agents.length} agents:`, agents.map(a => `${a.name} (${a.id})`));
            logger.info(`Agent map keys:`, Object.keys(agentMap));
        } else {
            logger.warn('No agents found in database!');
        }

        // Extract all individual issues from analysis results
        const allFindings = [];
        
        logger.info(`Processing ${analysisResults.length} file analysis results...`);
        
        for (const fileResult of analysisResults) {
            // Get file path - check multiple possible property names
            const filePath = fileResult.file || fileResult.path || fileResult.file_path;
            
            if (!filePath) {
                logger.warn(`Skipping fileResult with no file path:`, Object.keys(fileResult));
                continue;
            }
            
            logger.debug(`Processing file: ${filePath}`);
            
            // Follow the exact structure from AgentOrchestrator.aggregateResults()
            // fileResult.results.allIssues contains all issues with agent and specialty already attached
            // Each issue comes from BaseAgent.findings.issues with structure:
            // { severity, line, description, recommendation }
            // AgentOrchestrator adds: { agent, specialty }
            const issues = fileResult.results?.allIssues;
            
            if (!issues || !Array.isArray(issues) || issues.length === 0) {
                logger.debug(`No issues found in file: ${filePath}`);
                continue;
            }
            
            logger.debug(`Processing ${issues.length} issues from ${filePath}`);
            
            for (const issue of issues) {
                // Map specialty to category (schema constraint: 'bug', 'security', 'performance', 'style')
                // BaseAgent.specialty values: 'bug_detection', 'security', 'performance', 'style'
                const specialtyToCategory = {
                    'bug_detection': 'bug',
                    'security': 'security',
                    'performance': 'performance',
                    'style': 'style'
                };
                const category = specialtyToCategory[issue.specialty] || 'bug';
                
                // Normalize severity (BaseAgent returns: 'high', 'medium', 'low')
                // Schema allows: 'critical', 'high', 'medium', 'low', 'info'
                const rawSeverity = (issue.severity || 'medium').toLowerCase();
                const severityMap = {
                    'critical': 'critical',
                    'high': 'high',
                    'medium': 'medium',
                    'low': 'low',
                    'info': 'info'
                };
                const severity = severityMap[rawSeverity] || 'medium';
                
                // Get agent ID from agent name or specialty
                // BaseAgent provides both 'agent' (display name) and 'specialty' (which matches DB names)
                const agentName = issue.agent; // e.g., "Performance Optimizer"
                const specialty = issue.specialty; // e.g., "performance"
                
                // Debug: log first issue to see structure
                if (allFindings.length === 0) {
                    logger.debug(`Sample issue structure:`, {
                        agent: agentName,
                        specialty: specialty,
                        hasAgent: !!agentName,
                        hasSpecialty: !!specialty
                    });
                }
                
                // Try to find agent ID using specialty first (more reliable - matches DB names)
                // Database has names like "performance", "security", "style", "bug"
                let agentId = null;
                if (specialty) {
                    // Map specialty to database name (e.g., "bug_detection" -> "bug")
                    const dbName = specialtyToDbName[specialty] || specialty.toLowerCase();
                    logger.debug(`Looking up agent by specialty: "${specialty}" -> dbName: "${dbName}"`);
                    agentId = agentMap[dbName] || agentMap[dbName.toLowerCase()];
                    if (agentId) {
                        logger.debug(`Found agent ID ${agentId} for specialty "${specialty}"`);
                    }
                }
                
                // Fallback: try agent name directly (unlikely to work, but worth trying)
                if (!agentId && agentName) {
                    logger.debug(`Trying agent name lookup: "${agentName}"`);
                    agentId = agentMap[agentName] || agentMap[agentName.toLowerCase()];
                }
                
                if (!agentId) {
                    logger.warn(`❌ Could not find agent ID for agent="${agentName}", specialty="${specialty}"`);
                    logger.warn(`Available agent map keys:`, Object.keys(agentMap));
                } else {
                    logger.debug(`✓ Found agent ID ${agentId} for specialty="${specialty}"`);
                }
                
                // BaseAgent returns 'line' not 'lineNumber'
                // BaseAgent returns 'recommendation' not 'suggestion'
                allFindings.push({
                    job_id: jobId,
                    repo_id: repoId,
                    agent_id: agentId,
                    file_path: filePath,
                    line_number: issue.line || null,
                    severity: severity,
                    category: category,
                    title: issue.description || 'Code issue found', // Use description as title
                    description: issue.description || '',
                    suggestion: issue.recommendation || null,
                    code_snippet: null, // BaseAgent doesn't return code snippets
                    created_at: new Date().toISOString()
                });
            }
        }
        
        logger.info(`Total findings extracted: ${allFindings.length}`);

        // Insert all findings in batches (Supabase has a limit on batch inserts)
        if (allFindings.length > 0) {
            const BATCH_SIZE = 100;
            let insertedCount = 0;

            for (let i = 0; i < allFindings.length; i += BATCH_SIZE) {
                const batch = allFindings.slice(i, i + BATCH_SIZE);
                
                const { error: insertError } = await supabase
                    .from('reviews')
                    .insert(batch);

                if (insertError) {
                    logger.error(`Failed to insert review findings batch ${i / BATCH_SIZE + 1}: ${insertError.message}`);
                    // Log but continue - we don't want to fail the entire job
                } else {
                    insertedCount += batch.length;
                }
            }

            logger.success(`Inserted ${insertedCount} individual findings into reviews table`);
        } else {
            logger.info('No individual findings to save');
        }

        // ==============================================
        // STEP 7: MARK JOB AS COMPLETED
        // ==============================================
        await updateJobStatus(jobId, {
            status: 'completed',
            progress: 100,
            processed_files: files.length,
            completed_at: new Date().toISOString()
        });

        await updateRepositoryStatus(repoId, 'completed');

        job.progress(100);

        logger.success(`
╔════════════════════════════════════════════════════════╗
║  ✅ JOB COMPLETED SUCCESSFULLY                        ║
║  Job ID: ${jobId.substring(0, 30)}...                ║
║  Files Processed: ${files.length}                     ║
║  Total Issues: ${totalIssues}                         ║
║  Overall Score: ${avgScore}/100                       ║
║  Cost: $${totalCost.toFixed(6)}                       ║
╚════════════════════════════════════════════════════════╝
        `);
                
        // Return job result
        return {
            jobId,
            repoId,
            filesProcessed: files.length,
            totalIssues,
            overallScore: avgScore,
            status: 'completed'
        };
                    
    } catch (error) {
        logger.error(`❌ Job failed: ${error.message}`);
        logger.error(error.stack);
        
        // Update job as failed
        await updateJobStatus(jobId, {
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
        });
        
        await updateRepositoryStatus(repoId, 'failed');
        
        // Rethrow error so Bull knows job failed
        throw error;
    } finally {
        // Always cleanup temp directory
        if (cleanup) {
            logger.info('🧹 Cleaning up temporary files...');
            await cleanup();
            logger.success('Cleanup complete');
        }
    }
}

/**
 * Update job status in database
 */
async function updateJobStatus(jobId, updates) {
    try {
        const { error } = await supabase
            .from('review_jobs')
            .update(updates)
            .eq('id', jobId);

        if (error) {
            logger.error(`Failed to update job status: ${error.message}`);
            throw error;
        }

        logger.debug(`Job ${jobId} updated:`, updates);
    } catch (error) {
        logger.error(`Failed to update job status: ${error.message}`);
        throw error;
    }
}

/**
 * Update repository status in database
 */
async function updateRepositoryStatus(repoId, status) {
    try {
        const { error } = await supabase
            .from('repositories')
            .update({ status })
            .eq('id', repoId);

        if (error) {
            logger.error(`Failed to update repository status: ${error.message}`);
            throw error;
        }

        logger.debug(`Repository ${repoId} status: ${status}`);
    } catch (error) {
        logger.error(`Failed to update repository status: ${error.message}`);
        throw error;
    }
}

// ==============================================
// REGISTER JOB PROCESSOR
// ==============================================
export function startWorker() {
    logger.info(`
╔════════════════════════════════════════════════════════╗
║  🔧 WORKER STARTING                                   ║
║  Queue: code-review                                   ║
║  Concurrency: 2 (process 2 jobs simultaneously)      ║
╚════════════════════════════════════════════════════════╝
    `);

    // Register processor with concurrency of 2
    // Note: First parameter is the job name ('code-review'), second is concurrency
    reviewQueue.process('code-review', 2, processReviewJob);

    logger.success('Worker is now listening for jobs...');
    logger.info('Press Ctrl+C to stop the worker');
}

// ==============================================
// GRACEFUL SHUTDOWN
// ==============================================
export async function shutdown() {
    logger.info('Shutting down worker...');
    await reviewQueue.close();
    logger.success('Worker shutdown complete');
    process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);