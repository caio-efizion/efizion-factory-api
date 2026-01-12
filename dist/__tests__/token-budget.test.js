"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const token_service_1 = require("../token-service");
const logger_1 = __importDefault(require("../logger"));
describe('Token Budget Logging Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should log when a token is generated', () => {
        const logSpy = jest.spyOn(logger_1.default, 'info');
        (0, token_service_1.generateToken)('user123');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token generated for user: user123'));
    });
    it('should log when a token is used', () => {
        const logSpy = jest.spyOn(logger_1.default, 'info');
        (0, token_service_1.useToken)('token123');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token used: token123'));
    });
    it('should log when a token is validated successfully', () => {
        const logSpy = jest.spyOn(logger_1.default, 'info');
        (0, token_service_1.validateToken)('token123');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token validated: token123'));
    });
    it('should log an error when token validation fails', () => {
        const logSpy = jest.spyOn(logger_1.default, 'error');
        (0, token_service_1.validateToken)('invalidToken');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token validation failed: invalidToken'));
    });
});
