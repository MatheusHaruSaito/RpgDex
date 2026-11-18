export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: Error[];
}
interface Error {
  code: string;
  message: string;
}
