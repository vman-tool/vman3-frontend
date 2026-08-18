import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { SettingConfigService } from '../../services/settings_configs.service';
import { GenericIndexedDbService } from 'app/shared/services/indexedDB/generic-indexed-db.service';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';
import { FieldLabel } from '../../interface';

export interface LocationLevel {
  label: string;
  value: string;
  level: number;
}

export interface LocationSelection {
  field: string;
  field_label: string;
  label: string;
  value: string;
}

// One geographic node in the drill-down tree - e.g. a single region, or a
// single district once its parent region has been expanded. Distinct from
// LocationLevel, which describes a *level* (Region/District/...) as
// configured, not an actual place.
export interface TreeNode {
  field: string;
  fieldLabel: string;
  value: string;
  label: string;
  level: number;
  expanded: boolean;
  loaded: boolean;
  loading: boolean;
  children: TreeNode[];
}

// A dropdown whose panel is a real geographic drill-down tree: level 1
// (Region) values load up front, and expanding one fetches only the level 2
// (District) values that actually occur within that specific region in the
// submitted data, and so on down to however many levels are configured.
// Checking a node restricts access to everything under it - since the
// backend matches by field=value on the record itself, selecting a region
// already covers every district/ward/village within it with no separate
// "select all descendants" affordance needed.
@Component({
  standalone: false,
  selector: 'app-location-tree-select',
  templateUrl: './location-tree-select.component.html',
  styleUrl: './location-tree-select.component.scss'
})
export class LocationTreeSelectComponent implements OnDestroy {
  @Input() levels: LocationLevel[] = [];
  @Input() selected: LocationSelection[] = [];
  @Input() fieldLabels: FieldLabel[] = [];
  // When the person using this control is themselves access-limited, the
  // tree must start browsing from their own restricted place(s) rather than
  // Region - they can only ever grant access within (or equal to) their own
  // boundary, so showing the rest of the country here would just be a list
  // of options the backend will reject anyway.
  @Input() creatorBoundary: LocationSelection[] = [];
  @Output() selectedChange = new EventEmitter<LocationSelection[]>();

  isOpen = false;
  searchTerm = '';
  rootNodes: TreeNode[] = [];
  rootLoaded = false;
  rootLoading = false;

  dropdownPosition: { top: number; left: number; width: number } = { top: 0, left: 0, width: 340 };

  private readonly onAnyScroll = (event: Event) => {
    if (this.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }
    this.isOpen = false;
  };

  constructor(
    private elementRef: ElementRef,
    private settingConfigService: SettingConfigService,
    private genericIndexedDbService: GenericIndexedDbService,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  async toggleDropdown(event: MouseEvent): Promise<void> {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.dropdownPosition = { top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 340) };
      document.addEventListener('scroll', this.onAnyScroll, true);
      if (!this.rootLoaded) {
        await this.loadRoot();
      }
    } else {
      document.removeEventListener('scroll', this.onAnyScroll, true);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onAnyScroll, true);
  }

  private levelDef(level: number): LocationLevel | undefined {
    return this.levels.find(l => l.level === level);
  }

  private labelFor(field: string, value: string, fallback: string): string {
    const savedFieldLabel = this.fieldLabels?.find((fl: any) => fl?.field_id === field);
    return savedFieldLabel?.options?.hasOwnProperty(value) ? savedFieldLabel.options[value] : fallback;
  }

  private async fetchValues(field: string, parentField?: string, parentValue?: string): Promise<{ value: string; label: string }[]> {
    const fromDb: any = await lastValueFrom(this.settingConfigService.getUniqueValuesOfField(field, parentField, parentValue));
    let fromQuestions: any = await this.genericIndexedDbService.getDataByKeys(OBJECTSTORE_VA_QUESTIONS, [field]);
    fromQuestions = fromQuestions?.length ? fromQuestions.filter((o: any) => o)[0] : undefined;

    // The cached VA question's option labels are a global value->label map
    // for the field (not scoped to a parent), so they're just as valid for
    // dressing up a scoped child fetch as they are for the root level - only
    // *which values are valid* is scoped, which the backend already handled.
    const optionLabels = new Map<string, string>(
      (fromQuestions?.value?.options || []).map((opt: any) => [opt.value, opt.label])
    );
    return (fromDb?.data || []).map((loc: string) => ({
      value: loc,
      label: this.labelFor(field, loc, optionLabels.get(loc) || loc),
    }));
  }

  private async loadRoot(): Promise<void> {
    this.rootLoading = true;
    try {
      if (this.creatorBoundary.length > 0) {
        // Restricted creator: root the tree at their own place(s) instead of
        // fetching Region - those are the only starting points they're
        // allowed to grant access within.
        this.rootNodes = this.creatorBoundary
          .map(b => {
            const levelDef = this.levels.find(l => l.value === b.field);
            return levelDef ? this.makeNode(levelDef, b.value, b.label) : null;
          })
          .filter((n): n is TreeNode => !!n)
          .sort((a, b) => (a.label < b.label ? -1 : 1));
        this.rootLoaded = true;
        return;
      }

      const level1 = this.levelDef(1);
      if (!level1) return;
      const values = await this.fetchValues(level1.value);
      this.rootNodes = values
        .map(v => this.makeNode(level1, v.value, v.label))
        .sort((a, b) => (a.label < b.label ? -1 : 1));
      this.rootLoaded = true;
    } finally {
      this.rootLoading = false;
    }
  }

  private makeNode(level: LocationLevel, value: string, label: string): TreeNode {
    return {
      field: level.value,
      fieldLabel: level.label,
      value,
      label,
      level: level.level,
      expanded: false,
      loaded: false,
      loading: false,
      children: [],
    };
  }

  hasChildren(node: TreeNode): boolean {
    const nextLevel = this.levelDef(node.level + 1);
    // Some deployments map two configured levels (e.g. Ward and Village) to
    // the exact same underlying field when the source form doesn't actually
    // capture that finer level. Treating the next level as a real child
    // level in that case would "expand" a node into a single duplicate copy
    // of itself, so a node is a leaf whenever the next level has no field of
    // its own to drill into.
    return !!nextLevel && nextLevel.value !== node.field;
  }

  async toggleExpand(node: TreeNode): Promise<void> {
    if (!this.hasChildren(node)) return;
    node.expanded = !node.expanded;
    if (node.expanded && !node.loaded) {
      const childLevel = this.levelDef(node.level + 1)!;
      node.loading = true;
      try {
        const values = await this.fetchValues(childLevel.value, node.field, node.value);
        node.children = values
          .map(v => this.makeNode(childLevel, v.value, v.label))
          .sort((a, b) => (a.label < b.label ? -1 : 1));
        node.loaded = true;
      } finally {
        node.loading = false;
      }
    }
  }

  isChecked(node: TreeNode): boolean {
    return this.selected.some(item => item.field === node.field && item.value === node.value);
  }

  toggleCheck(node: TreeNode): void {
    if (this.isChecked(node)) {
      this.selected = this.selected.filter(s => !(s.field === node.field && s.value === node.value));
    } else {
      this.selected = [
        ...this.selected,
        { field: node.field, field_label: node.fieldLabel, label: node.label, value: node.value },
      ];
    }
    this.selectedChange.emit(this.selected);
  }

  removeChip(item: LocationSelection): void {
    this.selected = this.selected.filter(s => !(s.field === item.field && s.value === item.value));
    this.selectedChange.emit(this.selected);
  }

  clearAll(): void {
    this.selected = [];
    this.selectedChange.emit(this.selected);
  }

  matchesSearch(node: TreeNode): boolean {
    if (!this.searchTerm.trim()) return true;
    return node.label?.toLowerCase().includes(this.searchTerm.toLowerCase());
  }
}
