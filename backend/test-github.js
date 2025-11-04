import { cloneRepository, parseCodeFiles } from './src/services/githubService.js';
import { logger } from './src/utils/logger.js';

async function testGitHubService() {
  let cleanup;
  
  try {
    logger.info('🧪 Testing GitHub Service\n');
    
    // 1. Clone a small public repository
    logger.info('1️⃣ Cloning repository...');
    const repoUrl = 'https://github.com/sindresorhus/is-up';
    const result = await cloneRepository(repoUrl, 'main');
    
    logger.success(`Repository cloned to: ${result.path}`);
    cleanup = result.cleanup;
    
    // 2. Parse files
    logger.info('\n2️⃣ Parsing files...');
    const files = await parseCodeFiles(result.path);
    
    logger.success(`Found ${files.length} code files:`);
    
    files.forEach((file, index) => {
      logger.info(`  ${index + 1}. ${file.path} (${file.language}, ${file.lines} lines, ${file.sizeKB}KB)`);
    });
    
    // 3. Show sample file content
    if (files.length > 0) {
      logger.info('\n3️⃣ Sample file content:');
      logger.info(`File: ${files[0].path}`);
      logger.info(`First 500 characters:\n`);
      console.log(files[0].content.substring(0, 500) + '...\n');
    }
    
    logger.success('✅ GitHub service test complete!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
  } finally {
    // Cleanup temp directory
    if (cleanup) {
      logger.info('🧹 Cleaning up...');
      await cleanup();
      logger.success('Cleanup complete');
    }
  }
}

testGitHubService();