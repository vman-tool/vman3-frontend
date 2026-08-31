import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapDataComponent } from './map-data.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('MapDataComponent', () => {
  let component: MapDataComponent;
  let fixture: ComponentFixture<MapDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MapDataComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
