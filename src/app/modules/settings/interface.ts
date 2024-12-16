export interface OdkConfigModel {
  url: string;
  username: string;
  password: string;
  form_id: string;
  project_id: string;
  api_version: string;
}

export interface SystemConfig {
  app_name: string;
  page_title: string;
  page_subtitle?: string;
  admin_level1: string;
  admin_level2?: string;
  admin_level3?: string;
  admin_level4?: string;
  map_center: string;
  [key: string]: any; // Allow for any additional fields
}

export interface FieldLabel {
  field_id: string;
  label?: string;
  options?: any;
}

export interface FieldMapping {
  table_name: string;
  table_details?: string;
  instance_id: string;
  va_id: string;
  consent_id?: string;
  date: string;
  location_level1: string;
  location_level2?: string;
  deceased_gender?: string;
  is_adult: string;
  is_child: string;
  is_neonate: string;
  birth_date: string;
  death_date: string;
  interview_date: string;
  submitted_date: string;
  interviewer_name: string;
  interviewer_phone?: string;
  interviewer_sex?: string;
  [key: string]: any; // Allow for any additional fields
}

export interface settingsConfigData {
  odk_api_configs: OdkConfigModel;
  system_configs: SystemConfig;
  field_mapping: FieldMapping;
  va_summary: string[];
  field_labels?: FieldLabel[];
}

export interface SystemImages {
  favicon?: string;
  logo?: string;
  home_image?: string;
}
