import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { Logger } from './logger'; // Assuming there's a logger utility

const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';

interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export class TokenService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  generateToken(payload: TokenPayload): string {
    try {
      const token = sign(payload, SECRET_KEY, { expiresIn: '1h' });
      this.logger.info(`Token generated for userId: ${payload.userId}`);
      return token;
    } catch (error) {
      this.logger.error(`Error generating token for userId: ${payload.userId}`, error);
      throw new Error('Token generation failed');
    }
  }

  validateToken(token: string): TokenPayload | null {
    try {
      const decoded = verify(token, SECRET_KEY) as JwtPayload;
      this.logger.info(`Token validated for userId: ${decoded.userId}`);
      return decoded as TokenPayload;
    } catch (error) {
      this.logger.warn(`Invalid token: ${token}`, error);
      return null;
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = verify(token, SECRET_KEY, { ignoreExpiration: true }) as JwtPayload;
      this.logger.info(`Token decoded for userId: ${decoded.userId}`);
      return decoded as TokenPayload;
    } catch (error) {
      this.logger.error(`Error decoding token: ${token}`, error);
      return null;
    }
  }
}