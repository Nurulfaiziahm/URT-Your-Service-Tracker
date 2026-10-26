export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  success: false;
  error?: string;
  message?: string;
  code?: string;
  details?: { field: string; message: string }[];
}

export function unwrapPage<T>(response: PaginatedResponse<T>): PaginatedResult<T> {
  return { items: response.data, pagination: response.pagination };
}
