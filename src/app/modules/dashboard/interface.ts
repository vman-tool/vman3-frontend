export interface SubmissionsDataModel {
  totalSubmitedToday: number;
  region: string;
  district?: string;
  ward?: string;
  count: number;
  firstSubmission: string;
  lastSubmission: string;
  expected: number | null;
  completeness: number | null;
  coverage: number | null;
  adults: number;
  children: number;
  neonates: number;
  male: number;
  female: number;
}

export interface MonthlySubmission {
  month: number;
  year: number;
  count: number;
}
