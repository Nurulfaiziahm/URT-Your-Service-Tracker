import { Response } from 'express';

/**
 * Standard API Response Structure
 */
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Response Handler Utility
 * Provides consistent response formatting across the API
 */
export class ResponseHandler {
  /**
   * Success Response (200)
   */
  static success<T>(res: Response, data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      ...(message && { message }),
      ...(data !== null && data !== undefined && { data }),
    };
    return res.status(200).json(response);
  }

  /**
   * Created Response (201)
   */
  static created<T>(res: Response, data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      ...(message && { message }),
      ...(data !== null && data !== undefined && { data }),
    };
    return res.status(201).json(response);
  }

  /**
   * No Content Response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Paginated Response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      ...(message && { message }),
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    return res.status(200).json(response);
  }

  /**
   * Error Response
   */
  static error(
    res: Response,
    statusCode: number,
    message: string,
    code = 'REQUEST_FAILED',
  ): Response {
    const response: ApiResponse<null> = {
      success: false,
      error: message,
      code,
    };
    return res.status(statusCode).json(response);
  }
}
