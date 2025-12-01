
// Authentication Middleware
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

export const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Access denied.' });
        }
        
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        
        next();
    };
};

export default { generateToken, verifyToken, hashPassword, comparePassword, authenticate, authorize };
