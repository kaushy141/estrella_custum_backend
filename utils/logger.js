/**
 * Logger utility that ensures logs appear in PM2
 * PM2 captures both stdout and stderr, but console.log can sometimes be buffered
 * This utility ensures logs are properly flushed and visible
 */

const logger = {
    /**
     * Log info messages (goes to stdout)
     * For PM2 compatibility, this writes to stderr which PM2 always captures
     * @param {...any} args - Arguments to log
     */
    log: (...args) => {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        // Use stderr for PM2 compatibility - PM2 always captures stderr
        process.stderr.write(`[${new Date().toISOString()}] ${message}\n`);
    },

    /**
     * Log error messages (goes to stderr - PM2 always captures this)
     * @param {...any} args - Arguments to log
     */
    error: (...args) => {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        console.error(`[${new Date().toISOString()}] ERROR:`, message);
    },

    /**
     * Log warning messages
     * @param {...any} args - Arguments to log
     */
    warn: (...args) => {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        console.warn(`[${new Date().toISOString()}] WARN:`, message);
    },

    /**
     * Log debug messages (only in development)
     * @param {...any} args - Arguments to log
     */
    debug: (...args) => {
        if (process.env.NODE_ENV === 'development') {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            // Use stderr for PM2 compatibility
            process.stderr.write(`[${new Date().toISOString()}] DEBUG: ${message}\n`);
        }
    },
};

module.exports = logger;

