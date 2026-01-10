import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  apiKey: string;
  databaseUrl: string;
  logLevel: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY || 'default-api-key',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;