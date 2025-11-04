/**
 * Simple logging utility
 */

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  };
  
  function timestamp() {
    return new Date().toISOString();
  }
  
  export const logger = {
    info: (message, ...args) => {
      console.log(
        `${colors.blue}[${timestamp()}] INFO:${colors.reset}`,
        message,
        ...args
      );
    },
    
    success: (message, ...args) => {
      console.log(
        `${colors.green}[${timestamp()}] SUCCESS:${colors.reset}`,
        message,
        ...args
      );
    },
    
    warn: (message, ...args) => {
      console.warn(
        `${colors.yellow}[${timestamp()}] WARN:${colors.reset}`,
        message,
        ...args
      );
    },
    
    error: (message, ...args) => {
      console.error(
        `${colors.red}[${timestamp()}] ERROR:${colors.reset}`,
        message,
        ...args
      );
    },
    
    debug: (message, ...args) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `${colors.magenta}[${timestamp()}] DEBUG:${colors.reset}`,
          message,
          ...args
        );
      }
    }
  };