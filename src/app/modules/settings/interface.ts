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
  page_subtitle: string;
  admin_level1: string;
  admin_level2: string;
  admin_level3: string;
  admin_level4?: string;
  map_center?: string;
  [key: string]: any; // Allow for any additional fields
}

export interface FieldLabel {
  field_id: string;
  label?: string;
  options?: any;
}

export interface FieldMapping {
  instance_id: string;
  va_id: string;
  consent_id?: string;
  location_level1: string;
  location_level2?: string;
  location_level3?: string;
  location_level4?: string;
  deceased_gender: string;
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

export interface VaSummaryCodOptions {
  include_ccva_default: boolean;
  include_pcva: boolean;
}

export interface settingsConfigData {
  odk_api_configs: OdkConfigModel;
  system_configs: SystemConfig;
  field_mapping: FieldMapping;
  va_summary: string[];
  va_summary_cod_options?: VaSummaryCodOptions;
  field_labels?: FieldLabel[];
  sync_status?: SyncStatus;
  dqa_thresholds?: DqaThresholds;
}

export interface SystemImages {
  favicon?: string;
  logo?: string;
  home_image?: string;
}

export interface PCVAConfigurations {
  useICD11: boolean;
  vaAssignmentLimit: number;
  concordanceLevel: number;
  showOtherCodersWork: boolean;
  enableMLIntegration?: boolean;
}

export interface SyncStatus {
  last_sync_date?: string;
  last_sync_data_count?: number;
  total_synced_data?: number;
}

// ── DQA Threshold types ────────────────────────────────────────────────────

export type TierColor = 'green' | 'amber' | 'red' | 'none';

export interface TierConfig {
  label: string;
  color: TierColor;
}

export interface IndicatorThresholds {
  threshold_high: number;
  threshold_mid:  number;
  tier1: TierConfig;
  tier2: TierConfig;
  tier3: TierConfig;
}

export interface AidThresholds {
  min_normal:  number;
  max_normal:  number;
  tier_short:  TierConfig;
  tier_normal: TierConfig;
  tier_long:   TierConfig;
}

export interface DqaThresholds {
  ics: IndicatorThresholds;
  rrs: IndicatorThresholds;
  ici: IndicatorThresholds;
  aid: AidThresholds;
}
