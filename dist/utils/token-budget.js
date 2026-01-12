"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const logger_1 = require("./logger"); // Assuming there's a logger utility
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';
class TokenService {
    constructor() {
        this.logger = new logger_1.Logger();
    }
    generateToken(payload) {
        try {
            const token = (0, jsonwebtoken_1.sign)(payload, SECRET_KEY, { expiresIn: '1h' });
            this.logger.info(`Token generated for userId: ${payload.userId}`);
            return token;
        }
        catch (error) {
            this.logger.error(`Error generating token for userId: ${payload.userId}`, error);
            throw new Error('Token generation failed');
        }
    }
    validateToken(token) {
        try {
            const decoded = (0, jsonwebtoken_1.verify)(token, SECRET_KEY);
            this.logger.info(`Token validated for userId: ${decoded.userId}`);
            return decoded;
        }
        catch (error) {
            this.logger.warn(`Invalid token: ${token}`, error);
            return null;
        }
    }
    decodeToken(token) {
        try {
            const decoded = (0, jsonwebtoken_1.verify)(token, SECRET_KEY, { ignoreExpiration: true });
            this.logger.info(`Token decoded for userId: ${decoded.userId}`);
            return decoded;
        }
        catch (error) {
            this.logger.error(`Error decoding token: ${token}`, error);
            return null;
        }
    }
}
exports.TokenService = TokenService;
