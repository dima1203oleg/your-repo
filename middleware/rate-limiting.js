
// Rate Limiting Middleware
import rateLimit from 'express-rate-limit';

const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// Different limits for different endpoints
export const strictLimit = createRateLimit(15 * 60 * 1000, 10); // 15 min, 10 requests
export const normalLimit = createRateLimit(15 * 60 * 1000, 100); // 15 min, 100 requests
export const looseLimit = createRateLimit(15 * 60 * 1000, 1000); // 15 min, 1000 requests

export default createRateLimit;
