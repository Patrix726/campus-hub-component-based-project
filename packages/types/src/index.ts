// Common API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Generic ID type
export type ID = string | number;

// Timestamp types
export type Timestamp = Date | string | number;