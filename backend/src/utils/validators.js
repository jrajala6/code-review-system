/**
 * Validation utilities
 */

/**
 * Validate GitHub URL format
 */
export function isValidGitHubUrl(url) {
    const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/;
    return pattern.test(url);
}

/**
 * Extract repository infor from GitHub URL
 */
export function parseGitHubUrl(url) {
    try {
        const cleanUrl = url.replace('.git', '').replace(/\$/, '');
        const parts = cleanUrl.split('/');

        return {
            owner: parts[parts.length - 2],
            repo: parts[parts.length - 1],
                url: cleanUrl
        };
    } catch (error) {
        console.error('Error parsing GitHub URL:', error);
        return null;
    }
}

/**
 * Validate job status
 */
export function isValidJobStatus(status) {
    const validStatuses = ['pending', 'cloning', 'analyzing', 'completed', 'failed'];
    return validStatuses.includes(status);
}

/**
 * Validate review severity
 */
export function isValidSeverity(severity) {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    return validSeverities.includes(severity);
}

/**
 * Validate pagination status
 */
export function validatePagination(limit, offset) {
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    const errors = []
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        errors.push('Limit must be a number between 1 and 100');
    }
    if (isNaN(parsedOffset) || parsedOffset < 0) {
        errors.push('Offset must be a non-negative number');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        limit: parsedLimit,
        offset: parsedOffset
    }
}

