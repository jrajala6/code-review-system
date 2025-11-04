/**
 * Standardized API response helpers
 */

/**
 * Success response
 */
export function successResponse(data, message = null) {
    const response = {
      success: true,
      data
    };
    
    if (message) {
      response.message = message;
    }
    
    return response;
  }
  
  /**
   * Error response
   */
  export function errorResponse(message, details = null) {
    const response = {
      success: false,
      error: message
    };
    
    if (details) {
      response.details = details;
    }
    
    return response;
  }
  
  /**
   * Paginated response
   */
  export function paginatedResponse(data, total, limit, offset) {
    return {
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + data.length < total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Not found response
   */
  export function notFoundResponse(resource, id) {
    return {
      success: false,
      error: `${resource} not found`,
      id
    };
  }