import { logger } from '../logger';

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  it('logger.debug calls console.debug in development', () => {
    process.env.NODE_ENV = 'development';
    logger.debug('TestCtx', 'hello', { extra: 1 });
    expect(console.debug).toHaveBeenCalledWith(
      '[DEBUG] [TestCtx] hello',
      { extra: 1 }
    );
  });

  it('logger.info calls console.info in development', () => {
    process.env.NODE_ENV = 'development';
    logger.info('Ctx', 'info msg');
    expect(console.info).toHaveBeenCalledWith('[INFO] [Ctx] info msg');
  });

  it('logger.warn calls console.warn', () => {
    logger.warn('W', 'warning message');
    expect(console.warn).toHaveBeenCalledWith('[WARN] [W] warning message');
  });

  it('logger.error calls console.error', () => {
    const err = new Error('boom');
    logger.error('E', 'error message', err);
    expect(console.error).toHaveBeenCalledWith('[ERROR] [E] error message', err);
  });

  it('suppresses debug/info in production', () => {
    process.env.NODE_ENV = 'production';
    logger.debug('Ctx', 'should not appear');
    logger.info('Ctx', 'should not appear');
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it('still logs warn/error in production', () => {
    process.env.NODE_ENV = 'production';
    logger.warn('Ctx', 'prod warning');
    logger.error('Ctx', 'prod error');
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
