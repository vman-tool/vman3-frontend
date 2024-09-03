export interface ResponseMainModel<T> {
  data: T;
  message: string;
  error?: string;
  total: number;
}

export interface SearchFieldOption {
  label?: string;
  value?: any
}
