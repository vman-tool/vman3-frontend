export interface SubmissionsDataModel {
  totalSubmitedToday: number;
  region: string;
  district: string;
  count: number;
  lastSubmission: string;
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
