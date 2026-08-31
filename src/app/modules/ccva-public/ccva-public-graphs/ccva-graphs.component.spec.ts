import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { CcvaGraphsPublicComponent } from './ccva-graphs.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CcvaGraphsPublicComponent', () => {
  let component: CcvaGraphsPublicComponent;
  let fixture: ComponentFixture<CcvaGraphsPublicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcvaGraphsPublicComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaGraphsPublicComponent);
    component = fixture.componentInstance;
    // ngOnInit reads task_id/total_records/etc. straight off this @Input()
    // with no undefined guard.
    component.graphData = {};
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
