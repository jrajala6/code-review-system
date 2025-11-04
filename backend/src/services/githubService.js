import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

// ==============================================
// INITIALIZE GITHUB CLIENT
// ==============================================

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
  userAgent: 'code-review-system/1.0'
});

// ==============================================
// TEMPORARY DIRECTORY MANAGEMENT
// ==============================================

/**
 * Create a temporary directory for cloning
 */
function createTempDir() {
  const tempDir = path.join(
    os.tmpdir(),
    'code-review',
    `repo-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
  
  fs.ensureDirSync(tempDir);
  logger.debug(`Created temp directory: ${tempDir}`);
  
  return tempDir;
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDir(dirPath) {
  try {
    await fs.remove(dirPath);
    logger.debug(`Cleaned up temp directory: ${dirPath}`);
  } catch (error) {
    logger.warn(`Failed to cleanup temp directory: ${error.message}`);
  }
}

// ==============================================
// REPOSITORY CLONING
// ==============================================

/**
 * Clone a GitHub repository
 * @param {string} repoUrl - GitHub repository URL
 * @param {string} branch - Branch to clone (default: main)
 * @returns {Promise<{path: string, cleanup: Function}>}
 */
export async function cloneRepository(repoUrl, branch = 'main') {
  const tempDir = createTempDir();
  const git = simpleGit();
  
  try {
    logger.info(`Cloning repository: ${repoUrl} (branch: ${branch})`);
    
    const startTime = Date.now();
    
    // Clone with depth 1 (only latest commit, faster)
    await git.clone(repoUrl, tempDir, {
      '--branch': branch,
      '--depth': 1,
      '--single-branch': true
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`Repository cloned in ${duration}s: ${tempDir}`);
    
    return {
      path: tempDir,
      cleanup: () => cleanupTempDir(tempDir)
    };
    
  } catch (error) {
    // Cleanup on failure
    await cleanupTempDir(tempDir);
    
    logger.error(`Failed to clone repository: ${error.message}`);
    throw new Error(`Clone failed: ${error.message}`);
  }
}

// ==============================================
// FILE PARSING
// ==============================================

/**
 * Supported file extensions for code review
 */
const SUPPORTED_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  // Python
  '.py',
  // Java
  '.java',
  // C/C++
  '.c', '.cpp', '.h', '.hpp',
  // Go
  '.go',
  // Ruby
  '.rb',
  // PHP
  '.php',
  // Rust
  '.rs',
  // Swift
  '.swift',
  // Kotlin
  '.kt',
  // Others
  '.css', '.scss', '.html', '.vue', '.svelte'
]);

/**
 * Directories to ignore
 */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  'vendor',
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.venv'
]);

/**
 * Check if file should be analyzed
 */
function shouldAnalyzeFile(filePath) {
  const ext = path.extname(filePath);
  
  // Check extension
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return false;
  }
  
  // Check if in ignored directory
  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (IGNORED_DIRS.has(part)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get file size in KB
 */
function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

/**
 * Count lines in file
 */
function countLines(content) {
  return content.split('\n').length;
}

/**
 * Recursively find all code files
 */
async function findCodeFiles(dirPath, baseDir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        // Skip ignored directories
        if (!IGNORED_DIRS.has(entry.name)) {
          const subFiles = await findCodeFiles(fullPath, baseDir);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        // Check if should analyze
        if (shouldAnalyzeFile(fullPath)) {
          files.push({
            fullPath,
            relativePath
          });
        }
      }
    }
  } catch (error) {
    logger.warn(`Error reading directory ${dirPath}: ${error.message}`);
  }
  
  return files;
}

/**
 * Parse all code files from cloned repository
 * @param {string} repoPath - Path to cloned repository
 * @returns {Promise<Array>} - Array of parsed files
 */
export async function parseCodeFiles(repoPath) {
  logger.info(`Parsing code files from: ${repoPath}`);
  
  const startTime = Date.now();
  
  // Find all code files
  const codeFiles = await findCodeFiles(repoPath, repoPath);
  
  logger.info(`Found ${codeFiles.length} code files`);
  
  // Parse each file
  const parsedFiles = [];
  
  for (const file of codeFiles) {
    try {
      // Read file content
      const content = await fs.readFile(file.fullPath, 'utf8');
      
      // Skip empty files
      if (content.trim().length === 0) {
        continue;
      }
      
      // Skip very large files (> 100KB)
      const sizeKB = parseFloat(getFileSizeKB(file.fullPath));
      if (sizeKB > 100) {
        logger.debug(`Skipping large file (${sizeKB}KB): ${file.relativePath}`);
        continue;
      }
      
      // Parse file
      parsedFiles.push({
        path: file.relativePath,
        content: content,
        extension: path.extname(file.fullPath),
        language: detectLanguage(file.fullPath),
        lines: countLines(content),
        sizeKB: sizeKB
      });
      
    } catch (error) {
      logger.warn(`Failed to parse file ${file.relativePath}: ${error.message}`);
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.success(`Parsed ${parsedFiles.length} files in ${duration}s`);
  
  return parsedFiles;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath) {
  const ext = path.extname(filePath);
  
  const languageMap = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript React',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.mjs': 'JavaScript ES Module',
    '.cjs': 'JavaScript CommonJS',
    '.py': 'Python',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C Header',
    '.hpp': 'C++ Header',
    '.go': 'Go',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.rs': 'Rust',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.html': 'HTML',
    '.vue': 'Vue',
    '.svelte': 'Svelte'
  };
  
  return languageMap[ext] || 'Unknown';
}

// ==============================================
// GITHUB API UTILITIES
// ==============================================

/**
 * Fetch repository metadata from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
export async function getRepositoryInfo(owner, repo) {
  try {
    logger.info(`Fetching repository info: ${owner}/${repo}`);
    
    const { data } = await octokit.repos.get({
      owner,
      repo
    });
    
    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      defaultBranch: data.default_branch,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      size: data.size,
      isPrivate: data.private
    };
    
  } catch (error) {
    logger.error(`Failed to fetch repository info: ${error.message}`);
    throw error;
  }
}

/**
 * Check if repository exists and is accessible
 */
export async function validateRepository(owner, repo) {
  try {
    await octokit.repos.get({ owner, repo });
    return { valid: true };
  } catch (error) {
    if (error.status === 404) {
      return { 
        valid: false, 
        reason: 'Repository not found or is private' 
      };
    }
    return { 
      valid: false, 
      reason: error.message 
    };
  }
}

// ==============================================
// EXPORT ALL FUNCTIONS
// ==============================================

export default {
  cloneRepository,
  parseCodeFiles,
  getRepositoryInfo,
  validateRepository,
  detectLanguage
};