"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    apiKey: process.env.API_KEY || 'default-api-key',
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
    logLevel: process.env.LOG_LEVEL || 'info',
};
exports.default = config;
