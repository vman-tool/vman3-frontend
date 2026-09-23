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
  age_unclassified: number;
  male: number;
  female: number;
  gender_unclassified: number;
}

export interface MonthlySubmission {
  month: number;
  year: number;
  count: number;
}
