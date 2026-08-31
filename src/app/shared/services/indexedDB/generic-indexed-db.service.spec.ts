import { TestBed } from '@angular/core/testing';
import { GenericIndexedDbService } from './generic-indexed-db.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';


describe('GenericIndexedDbService', () => {
  let service: GenericIndexedDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GenericIndexedDbService);
  });

  it('should be created', async () => {
    expect(service).toBeTruthy();
    // The constructor kicks off initDB() without awaiting it. Wait for it
    // here too, otherwise it can still be in flight against fake-indexeddb
    // when Jest tears down this test's environment, and its eventual
    // rejection surfaces as an uncaught exception in an unrelated test.
    await (service as unknown as { dbPromise: Promise<unknown> }).dbPromise;
  });
});
