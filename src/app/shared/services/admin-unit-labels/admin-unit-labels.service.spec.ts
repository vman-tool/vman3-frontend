import { of } from 'rxjs';
import { AdminUnitLabelsService } from './admin-unit-labels.service';

function makeService(tree: any[] = []) {
  const settingConfigService = {
    getExpectedDeaths: jest.fn().mockReturnValue(of({ data: { configured: true, tree } })),
  } as any;
  const service = new AdminUnitLabelsService(settingConfigService);
  return { service, settingConfigService };
}

const TREE = [
  {
    key: 'r1', level: 1, value: 'Arusha', label: 'Arusha', expected_deaths: {}, is_leaf: false,
    children: [
      {
        key: 'd1', level: 2, value: 'Ilala_Municipal_Council', label: 'Ilala Municipal Council',
        expected_deaths: {}, is_leaf: false,
        children: [
          { key: 'w1', level: 3, value: 'Magomeni_Ward', label: 'Magomeni Ward', expected_deaths: {}, is_leaf: true, children: [] },
        ],
      },
    ],
  },
];

describe('AdminUnitLabelsService', () => {
  describe('load', () => {
    it('flattens the whole tree (every level) into one value -> label map', async () => {
      const { service } = makeService(TREE);

      const map = await service.load().toPromise();

      expect(map!.get('Arusha')).toBe('Arusha');
      expect(map!.get('Ilala_Municipal_Council')).toBe('Ilala Municipal Council');
      expect(map!.get('Magomeni_Ward')).toBe('Magomeni Ward');
    });

    it('only fetches once - later calls reuse the cached map', async () => {
      const { service, settingConfigService } = makeService(TREE);

      await service.load().toPromise();
      await service.load().toPromise();
      await service.load().toPromise();

      expect(settingConfigService.getExpectedDeaths).toHaveBeenCalledTimes(1);
    });

    it('handles no data configured yet without throwing', async () => {
      const { service } = makeService([]);
      const map = await service.load().toPromise();
      expect(map!.size).toBe(0);
    });

    it('refetches after clearCache', async () => {
      const { service, settingConfigService } = makeService(TREE);
      await service.load().toPromise();

      service.clearCache();
      await service.load().toPromise();

      expect(settingConfigService.getExpectedDeaths).toHaveBeenCalledTimes(2);
    });
  });

  describe('friendlyLabel', () => {
    it('returns the friendly label for a known code, before any explicit load()', async () => {
      const { service } = makeService(TREE);
      await service.load().toPromise();

      expect(service.friendlyLabel('Ilala_Municipal_Council')).toBe('Ilala Municipal Council');
    });

    it('falls back to the raw value when the code is not in the admin hierarchy', async () => {
      const { service } = makeService(TREE);
      await service.load().toPromise();

      expect(service.friendlyLabel('Some_Unknown_Code')).toBe('Some_Unknown_Code');
    });

    it('falls back to the raw value when nothing has been loaded yet', () => {
      const { service } = makeService(TREE);
      expect(service.friendlyLabel('Ilala_Municipal_Council')).toBe('Ilala_Municipal_Council');
    });

    it('uses an explicit fallback over the raw value when given', async () => {
      const { service } = makeService(TREE);
      await service.load().toPromise();

      expect(service.friendlyLabel('Some_Unknown_Code', 'Cached Fallback')).toBe('Cached Fallback');
    });

    it('returns an empty string for a blank raw value with no fallback', () => {
      const { service } = makeService(TREE);
      expect(service.friendlyLabel(null)).toBe('');
      expect(service.friendlyLabel(undefined)).toBe('');
    });
  });
});
