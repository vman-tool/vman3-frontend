import { TestBed } from '@angular/core/testing';
import { GenericIndexedDbService } from './generic-indexed-db.service';


describe('GenericIndexedDbService', () => {
  let service: GenericIndexedDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenericIndexedDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
