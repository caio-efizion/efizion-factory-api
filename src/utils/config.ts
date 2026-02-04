import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  apiKey: string;
  databaseUrl: string;
  logLevel: string;
}

if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable is required');
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY,
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;