import { computeBreakdown, pieGradient, donutClusterIconHtml, clusterTooltipHtml } from './cluster-donut';

describe('cluster-donut utils', () => {
  describe('computeBreakdown', () => {
    const items = [
      { category: 'a' }, { category: 'a' }, { category: 'b' }, { category: null },
    ];

    it('tallies by the given value getter, most common first', () => {
      const breakdown = computeBreakdown(
        items,
        item => item.category,
        value => (value === 'a' ? '#111' : '#222'),
      );

      expect(breakdown).toEqual([
        { value: 'a', label: 'a', color: '#111', count: 2 },
        { value: 'b', label: 'b', color: '#222', count: 1 },
        { value: 'Unclassified', label: 'Unclassified', color: '#9ca3af', count: 1 },
      ]);
    });

    it('applies labelFor only to real values, never to Unclassified', () => {
      const breakdown = computeBreakdown(
        items,
        item => item.category,
        () => '#000',
        value => value.toUpperCase(),
      );

      expect(breakdown.find(b => b.value === 'a')?.label).toBe('A');
      expect(breakdown.find(b => b.value === 'Unclassified')?.label).toBe('Unclassified');
    });

    it('supports a custom unclassified color', () => {
      const breakdown = computeBreakdown(items, item => item.category, () => '#000', undefined, '#ff0000');
      expect(breakdown.find(b => b.value === 'Unclassified')?.color).toBe('#ff0000');
    });

    it('returns an empty array for an empty item list', () => {
      expect(computeBreakdown([], () => 'x', () => '#000')).toEqual([]);
    });
  });

  describe('pieGradient', () => {
    it('produces a conic-gradient covering the full circle, ordered alphabetically by value', () => {
      const gradient = pieGradient(
        [
          { value: 'b', label: 'B', color: '#222222', count: 1 },
          { value: 'a', label: 'A', color: '#111111', count: 3 },
        ],
        4,
      );

      expect(gradient).toBe('conic-gradient(#111111 0deg 270deg, #222222 270deg 360deg)');
    });

    it('falls back to a plain color when the breakdown is empty', () => {
      expect(pieGradient([], 0)).toBe('#3b82f6');
      expect(pieGradient([], 0, '#000000')).toBe('#000000');
    });
  });

  describe('donutClusterIconHtml', () => {
    it('renders a masked donut ring with the count centered', () => {
      const breakdown = [{ value: 'a', label: 'A', color: '#111111', count: 4 }];
      const html = donutClusterIconHtml(4, breakdown, 40, 13);

      expect(html).toContain('conic-gradient(#111111 0deg 360deg)');
      expect(html).toContain('mask:radial-gradient(circle closest-side, transparent 0 55%, black 56% 100%)');
      expect(html).toContain('>4<');
    });
  });

  describe('clusterTooltipHtml', () => {
    it('reports each category\'s exact count and percentage, and the given unit label', () => {
      const breakdown = [
        { value: 'a', label: 'Group I: Communicable', color: '#111111', count: 3 },
        { value: 'b', label: 'Group II: Non-Communicable', color: '#222222', count: 1 },
      ];
      const html = clusterTooltipHtml(4, breakdown, 'VA records');

      expect(html).toContain('4 VA records');
      expect(html).toContain('Group I: Communicable');
      expect(html).toContain('3 (75.0%)');
      expect(html).toContain('Group II: Non-Communicable');
      expect(html).toContain('1 (25.0%)');
    });

    it('defaults the unit label to "VA records"', () => {
      const html = clusterTooltipHtml(2, [{ value: 'a', label: 'A', color: '#111', count: 2 }]);
      expect(html).toContain('2 VA records');
    });
  });
});
