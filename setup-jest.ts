import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// jsdom has no IndexedDB implementation. Services built on `idb`
// (IndexedDBService, GenericIndexedDbService) call it eagerly from their
// constructor, which otherwise crashes the whole Jest worker rather than
// failing a single test.
import 'fake-indexeddb/auto';

// Mirrors angular.json's `scripts` array: in the real build, leaflet.js and
// leaflet.markercluster.js are loaded as plain global scripts (not ESM),
// because leaflet.markercluster references the bare `L` global directly
// rather than importing it - see the comment in map-data.component.ts.
// `require`, not `import`, so this runs before leaflet.markercluster looks
// up `L` off the global object.
import L from 'leaflet';
(globalThis as unknown as { L: typeof L }).L = L;
require('leaflet.markercluster');

setupZoneTestEnv();
