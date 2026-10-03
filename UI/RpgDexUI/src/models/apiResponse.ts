export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors: Error;
}
interface Error {
  code: string;
  message: string;
}
