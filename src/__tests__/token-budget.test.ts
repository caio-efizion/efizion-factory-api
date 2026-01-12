import { generateToken, useToken, validateToken } from '../token-service';
import logger from '../logger';

describe('Token Budget Logging Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log when a token is generated', () => {
    const logSpy = jest.spyOn(logger, 'info');
    generateToken('user123');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token generated for user: user123'));
  });

  it('should log when a token is used', () => {
    const logSpy = jest.spyOn(logger, 'info');
    useToken('token123');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token used: token123'));
  });

  it('should log when a token is validated successfully', () => {
    const logSpy = jest.spyOn(logger, 'info');
    validateToken('token123');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token validated: token123'));
  });

  it('should log an error when token validation fails', () => {
    const logSpy = jest.spyOn(logger, 'error');
    validateToken('invalidToken');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Token validation failed: invalidToken'));
  });

});