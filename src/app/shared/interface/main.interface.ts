export interface ResponseMainModel<T> {
  data: T;
  message: string;
  error?: string;
  total: number;
}
