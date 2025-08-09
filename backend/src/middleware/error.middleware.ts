import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public source?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error(`${err.name}: ${err.message}`, {
      source: err.source,
      stack: err.stack
    });
    
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Unexpected errors
  logger.error('Unexpected Error', {
    error: err,
    stack: err.stack
  });

  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred'
  });
};
