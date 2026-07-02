import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SettingConfigService } from '../../services/settings_configs.service';
import { DqaThresholdService, DEFAULT_DQA_THRESHOLDS } from '../../../data-quality/services/dqa-threshold.service';
import { DqaThresholds } from '../../interface';

@Component({
  selector: 'app-dqa-thresholds',
  templateUrl: './dqa-thresholds.component.html',
})
export class DqaThresholdsComponent implements OnInit {
  form!: FormGroup;
  isLoading  = true;
  isSaving   = false;
  saveSuccess = false;
  saveError  = '';

  readonly colors = [
    { value: 'green', label: 'Green', dotClass: 'bg-emerald-500' },
    { value: 'amber', label: 'Amber', dotClass: 'bg-amber-400'   },
    { value: 'red',   label: 'Red',   dotClass: 'bg-red-500'     },
    { value: 'none',  label: 'None',  dotClass: 'bg-gray-300'    },
  ];

  constructor(
    private fb: FormBuilder,
    private settingConfigService: SettingConfigService,
    private dqaThresholdService: DqaThresholdService,
  ) {}

  ngOnInit(): void {
    this.settingConfigService.getSettingsConfig().subscribe({
      next: data => {
        this.buildForm(data?.dqa_thresholds ?? DEFAULT_DQA_THRESHOLDS);
        this.isLoading = false;
      },
      error: () => {
        this.buildForm(DEFAULT_DQA_THRESHOLDS);
        this.isLoading = false;
      },
    });
  }

  private buildForm(t: DqaThresholds): void {
    this.form = this.fb.group({
      // ICS
      ics_threshold_high: [t.ics.threshold_high, [Validators.required, Validators.min(0), Validators.max(100)]],
      ics_threshold_mid:  [t.ics.threshold_mid,  [Validators.required, Validators.min(0), Validators.max(100)]],
      ics_tier1_label: [t.ics.tier1.label, Validators.required],
      ics_tier1_color: [t.ics.tier1.color],
      ics_tier2_label: [t.ics.tier2.label, Validators.required],
      ics_tier2_color: [t.ics.tier2.color],
      ics_tier3_label: [t.ics.tier3.label, Validators.required],
      ics_tier3_color: [t.ics.tier3.color],
      // RRS
      rrs_threshold_high: [t.rrs.threshold_high, [Validators.required, Validators.min(0), Validators.max(100)]],
      rrs_threshold_mid:  [t.rrs.threshold_mid,  [Validators.required, Validators.min(0), Validators.max(100)]],
      rrs_tier1_label: [t.rrs.tier1.label, Validators.required],
      rrs_tier1_color: [t.rrs.tier1.color],
      rrs_tier2_label: [t.rrs.tier2.label, Validators.required],
      rrs_tier2_color: [t.rrs.tier2.color],
      rrs_tier3_label: [t.rrs.tier3.label, Validators.required],
      rrs_tier3_color: [t.rrs.tier3.color],
      // ICI
      ici_threshold_high: [t.ici.threshold_high, [Validators.required, Validators.min(0), Validators.max(100)]],
      ici_threshold_mid:  [t.ici.threshold_mid,  [Validators.required, Validators.min(0), Validators.max(100)]],
      ici_tier1_label: [t.ici.tier1.label, Validators.required],
      ici_tier1_color: [t.ici.tier1.color],
      ici_tier2_label: [t.ici.tier2.label, Validators.required],
      ici_tier2_color: [t.ici.tier2.color],
      ici_tier3_label: [t.ici.tier3.label, Validators.required],
      ici_tier3_color: [t.ici.tier3.color],
      // AID
      aid_min_normal:       [t.aid.min_normal, [Validators.required, Validators.min(0)]],
      aid_max_normal:       [t.aid.max_normal, [Validators.required, Validators.min(0)]],
      aid_tier_short_label: [t.aid.tier_short.label,  Validators.required],
      aid_tier_short_color: [t.aid.tier_short.color],
      aid_tier_normal_label:[t.aid.tier_normal.label, Validators.required],
      aid_tier_normal_color:[t.aid.tier_normal.color],
      aid_tier_long_label:  [t.aid.tier_long.label,   Validators.required],
      aid_tier_long_color:  [t.aid.tier_long.color],
    });
  }

  getColor(field: string): string {
    return this.form.get(field)?.value ?? 'none';
  }

  setColor(field: string, color: string): void {
    this.form.get(field)?.setValue(color);
  }

  save(): void {
    if (this.form.invalid) return;
    this.isSaving   = true;
    this.saveError  = '';
    this.saveSuccess = false;

    const v = this.form.value;
    const payload: DqaThresholds = {
      ics: {
        threshold_high: +v.ics_threshold_high,
        threshold_mid:  +v.ics_threshold_mid,
        tier1: { label: v.ics_tier1_label, color: v.ics_tier1_color },
        tier2: { label: v.ics_tier2_label, color: v.ics_tier2_color },
        tier3: { label: v.ics_tier3_label, color: v.ics_tier3_color },
      },
      rrs: {
        threshold_high: +v.rrs_threshold_high,
        threshold_mid:  +v.rrs_threshold_mid,
        tier1: { label: v.rrs_tier1_label, color: v.rrs_tier1_color },
        tier2: { label: v.rrs_tier2_label, color: v.rrs_tier2_color },
        tier3: { label: v.rrs_tier3_label, color: v.rrs_tier3_color },
      },
      ici: {
        threshold_high: +v.ici_threshold_high,
        threshold_mid:  +v.ici_threshold_mid,
        tier1: { label: v.ici_tier1_label, color: v.ici_tier1_color },
        tier2: { label: v.ici_tier2_label, color: v.ici_tier2_color },
        tier3: { label: v.ici_tier3_label, color: v.ici_tier3_color },
      },
      aid: {
        min_normal:  +v.aid_min_normal,
        max_normal:  +v.aid_max_normal,
        tier_short:  { label: v.aid_tier_short_label,  color: v.aid_tier_short_color  },
        tier_normal: { label: v.aid_tier_normal_label, color: v.aid_tier_normal_color },
        tier_long:   { label: v.aid_tier_long_label,   color: v.aid_tier_long_color   },
      },
    };

    this.settingConfigService.saveConnectionData('dqa_thresholds', payload).subscribe({
      next: () => {
        this.isSaving    = false;
        this.saveSuccess = true;
        this.settingConfigService.clearCache();
        this.dqaThresholdService.reload();
        setTimeout(() => (this.saveSuccess = false), 3000);
      },
      error: () => {
        this.isSaving  = false;
        this.saveError = 'Failed to save thresholds. Please try again.';
      },
    });
  }

  resetToDefaults(): void {
    this.buildForm(DEFAULT_DQA_THRESHOLDS);
  }
}
