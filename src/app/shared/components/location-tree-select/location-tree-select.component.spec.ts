import { of } from 'rxjs';
import {
  LocationTreeSelectComponent,
  LocationLevel,
  LocationSelection,
  TreeNode,
} from './location-tree-select.component';

// Constructed directly, without TestBed/template compilation, since every
// method under test here is plain component-class logic or a service call -
// none of it needs the rendered DOM.
function makeComponent(overrides: {
  levels?: LocationLevel[];
  selected?: LocationSelection[];
  creatorBoundary?: LocationSelection[];
  uniqueValuesResponse?: any;
  cachedQuestionOptions?: any;
  adminLabels?: Map<string, string>;
} = {}) {
  const elementRef = { nativeElement: document.createElement('div') } as any;
  const settingConfigService = {
    getUniqueValuesOfField: jest.fn().mockReturnValue(
      of(overrides.uniqueValuesResponse ?? { data: ['north', 'south'] })
    ),
  } as any;
  const genericIndexedDbService = {
    getDataByKeys: jest.fn().mockResolvedValue(overrides.cachedQuestionOptions ?? []),
  } as any;
  const adminUnitLabelsService = {
    load: jest.fn().mockReturnValue(of(overrides.adminLabels ?? new Map())),
  } as any;

  const component = new LocationTreeSelectComponent(
    elementRef,
    settingConfigService,
    genericIndexedDbService,
    adminUnitLabelsService
  );
  component.levels = overrides.levels ?? [
    { label: 'Region', value: 'region', level: 1 },
    { label: 'District', value: 'district', level: 2 },
  ];
  component.selected = overrides.selected ?? [];
  component.creatorBoundary = overrides.creatorBoundary ?? [];

  return { component, settingConfigService, genericIndexedDbService, adminUnitLabelsService };
}

function makeNode(partial: Partial<TreeNode>): TreeNode {
  return {
    field: 'region',
    fieldLabel: 'Region',
    value: 'north',
    label: 'North',
    level: 1,
    expanded: false,
    loaded: false,
    loading: false,
    children: [],
    ...partial,
  };
}

describe('LocationTreeSelectComponent', () => {
  describe('hasChildren', () => {
    it('is true when the next level is a genuinely different field', () => {
      const { component } = makeComponent();
      expect(component.hasChildren(makeNode({ level: 1, field: 'region' }))).toBe(true);
    });

    it('is false when there is no next level configured', () => {
      const { component } = makeComponent({
        levels: [{ label: 'Region', value: 'region', level: 1 }],
      });
      expect(component.hasChildren(makeNode({ level: 1, field: 'region' }))).toBe(false);
    });

    // Regression: some deployments map two configured levels (e.g. Ward and
    // Village) to the same underlying field when the source form doesn't
    // capture that finer level. The next level existing with a blank value
    // used to still count as "has children", expanding a node into a single
    // duplicate copy of itself.
    it('is false when the next level has no field mapped (blank value)', () => {
      const { component } = makeComponent({
        levels: [
          { label: 'Region', value: 'region', level: 1 },
          { label: 'Ward', value: '', level: 2 },
        ],
      });
      expect(component.hasChildren(makeNode({ level: 1, field: 'region' }))).toBe(false);
    });

    it('is false when the next level maps to the same field as this node', () => {
      const { component } = makeComponent({
        levels: [
          { label: 'Ward', value: 'ward', level: 1 },
          { label: 'Village', value: 'ward', level: 2 },
        ],
      });
      expect(component.hasChildren(makeNode({ level: 1, field: 'ward' }))).toBe(false);
    });
  });

  describe('isChecked / toggleCheck', () => {
    it('reports unchecked when nothing in selected matches field+value', () => {
      const { component } = makeComponent({ selected: [] });
      expect(component.isChecked(makeNode({ field: 'region', value: 'north' }))).toBe(false);
    });

    it('reports checked when selected has a matching field+value pair', () => {
      const { component } = makeComponent({
        selected: [{ field: 'region', field_label: 'Region', label: 'North', value: 'north' }],
      });
      expect(component.isChecked(makeNode({ field: 'region', value: 'north' }))).toBe(true);
    });

    it('adds the node to selected and emits when toggled on', () => {
      const { component } = makeComponent({ selected: [] });
      const emitted: LocationSelection[][] = [];
      component.selectedChange.subscribe((v) => emitted.push(v));

      component.toggleCheck(makeNode({ field: 'region', fieldLabel: 'Region', value: 'north', label: 'North' }));

      expect(component.selected).toEqual([
        { field: 'region', field_label: 'Region', label: 'North', value: 'north' },
      ]);
      expect(emitted).toEqual([component.selected]);
    });

    it('removes the node from selected and emits when toggled off', () => {
      const { component } = makeComponent({
        selected: [{ field: 'region', field_label: 'Region', label: 'North', value: 'north' }],
      });
      const emitted: LocationSelection[][] = [];
      component.selectedChange.subscribe((v) => emitted.push(v));

      component.toggleCheck(makeNode({ field: 'region', value: 'north' }));

      expect(component.selected).toEqual([]);
      expect(emitted).toEqual([[]]);
    });

    it('leaves other selections untouched when removing one', () => {
      const { component } = makeComponent({
        selected: [
          { field: 'region', field_label: 'Region', label: 'North', value: 'north' },
          { field: 'region', field_label: 'Region', label: 'South', value: 'south' },
        ],
      });

      component.toggleCheck(makeNode({ field: 'region', value: 'north' }));

      expect(component.selected).toEqual([
        { field: 'region', field_label: 'Region', label: 'South', value: 'south' },
      ]);
    });
  });

  describe('removeChip / clearAll', () => {
    it('removeChip drops only the matching item and emits the new list', () => {
      const { component } = makeComponent({
        selected: [
          { field: 'region', field_label: 'Region', label: 'North', value: 'north' },
          { field: 'region', field_label: 'Region', label: 'South', value: 'south' },
        ],
      });
      const emitted: LocationSelection[][] = [];
      component.selectedChange.subscribe((v) => emitted.push(v));

      component.removeChip({ field: 'region', field_label: 'Region', label: 'North', value: 'north' });

      expect(component.selected).toEqual([
        { field: 'region', field_label: 'Region', label: 'South', value: 'south' },
      ]);
      expect(emitted).toEqual([component.selected]);
    });

    it('clearAll empties selected and emits an empty list', () => {
      const { component } = makeComponent({
        selected: [{ field: 'region', field_label: 'Region', label: 'North', value: 'north' }],
      });
      const emitted: LocationSelection[][] = [];
      component.selectedChange.subscribe((v) => emitted.push(v));

      component.clearAll();

      expect(component.selected).toEqual([]);
      expect(emitted).toEqual([[]]);
    });
  });

  describe('matchesSearch', () => {
    it('matches everything when the search term is blank', () => {
      const { component } = makeComponent();
      component.searchTerm = '   ';
      expect(component.matchesSearch(makeNode({ label: 'North' }))).toBe(true);
    });

    it('matches case-insensitively against the node label', () => {
      const { component } = makeComponent();
      component.searchTerm = 'nor';
      expect(component.matchesSearch(makeNode({ label: 'North' }))).toBe(true);
      expect(component.matchesSearch(makeNode({ label: 'South' }))).toBe(false);
    });
  });

  describe('toggleDropdown / loadRoot', () => {
    const fakeMouseEvent = () =>
      ({
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, left: 20, width: 200 }),
        },
      } as unknown as MouseEvent);

    it('fetches and sorts level-1 values from the backend when there is no creator boundary', async () => {
      const { component, settingConfigService } = makeComponent({
        uniqueValuesResponse: { data: ['south', 'north'] },
      });

      await component.toggleDropdown(fakeMouseEvent());

      expect(settingConfigService.getUniqueValuesOfField).toHaveBeenCalledWith('region', undefined, undefined);
      expect(component.rootNodes.map((n) => n.value)).toEqual(['north', 'south']);
      expect(component.rootNodes.every((n) => n.level === 1 && n.field === 'region')).toBe(true);
      expect(component.rootLoaded).toBe(true);
      expect(component.isOpen).toBe(true);
    });

    // Regression: this used to read a separately hand-typed "Re-label
    // Access Fields" alias list; it now sources friendly names from the
    // expected_deaths admin hierarchy instead, falling back to the raw
    // value when a code isn't in it.
    it('prefers the expected_deaths admin-unit label over the raw value', async () => {
      const { component } = makeComponent({
        uniqueValuesResponse: { data: ['north'] },
        adminLabels: new Map([['north', 'Northern Region']]),
      });

      await component.toggleDropdown(fakeMouseEvent());

      expect(component.rootNodes[0].label).toBe('Northern Region');
    });

    it('falls back to the raw value when the code has no expected_deaths label', async () => {
      const { component } = makeComponent({
        uniqueValuesResponse: { data: ['unmapped_code'] },
        adminLabels: new Map([['north', 'Northern Region']]),
      });

      await component.toggleDropdown(fakeMouseEvent());

      expect(component.rootNodes[0].label).toBe('unmapped_code');
    });

    it('roots the tree at the creator boundary instead of fetching level 1, for a restricted user', async () => {
      const { component, settingConfigService } = makeComponent({
        creatorBoundary: [
          { field: 'district', field_label: 'District', label: 'Central', value: 'central' },
        ],
        levels: [
          { label: 'Region', value: 'region', level: 1 },
          { label: 'District', value: 'district', level: 2 },
        ],
      });

      await component.toggleDropdown(fakeMouseEvent());

      expect(settingConfigService.getUniqueValuesOfField).not.toHaveBeenCalled();
      expect(component.rootNodes).toEqual([
        expect.objectContaining({ field: 'district', value: 'central', label: 'Central', level: 2 }),
      ]);
      expect(component.rootLoaded).toBe(true);
    });

    it('does not refetch on a second open once the root is already loaded', async () => {
      const { component, settingConfigService } = makeComponent();

      await component.toggleDropdown(fakeMouseEvent()); // opens, loads
      await component.toggleDropdown(fakeMouseEvent()); // closes
      await component.toggleDropdown(fakeMouseEvent()); // opens again

      expect(settingConfigService.getUniqueValuesOfField).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleExpand', () => {
    it('is a no-op on a leaf node', async () => {
      const { component, settingConfigService } = makeComponent({
        levels: [{ label: 'Region', value: 'region', level: 1 }],
      });
      const node = makeNode({ level: 1, field: 'region', expanded: false });

      await component.toggleExpand(node);

      expect(node.expanded).toBe(false);
      expect(settingConfigService.getUniqueValuesOfField).not.toHaveBeenCalled();
    });

    it('fetches and sorts child values scoped to the parent field/value on first expand', async () => {
      const { component, settingConfigService } = makeComponent({
        uniqueValuesResponse: { data: ['west', 'east'] },
      });
      const node = makeNode({ level: 1, field: 'region', value: 'north', expanded: false, loaded: false });

      await component.toggleExpand(node);

      expect(settingConfigService.getUniqueValuesOfField).toHaveBeenCalledWith('district', 'region', 'north');
      expect(node.expanded).toBe(true);
      expect(node.loaded).toBe(true);
      expect(node.loading).toBe(false);
      expect(node.children.map((c) => c.value)).toEqual(['east', 'west']);
      expect(node.children.every((c) => c.field === 'district' && c.level === 2)).toBe(true);
    });

    it('collapses without refetching when toggled again after already loaded', async () => {
      const { component, settingConfigService } = makeComponent();
      const node = makeNode({ level: 1, field: 'region', value: 'north' });

      await component.toggleExpand(node); // expand + fetch
      await component.toggleExpand(node); // collapse

      expect(node.expanded).toBe(false);
      expect(settingConfigService.getUniqueValuesOfField).toHaveBeenCalledTimes(1);
    });
  });
});
