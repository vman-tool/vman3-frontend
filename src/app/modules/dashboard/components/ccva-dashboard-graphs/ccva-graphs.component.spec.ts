import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaDashboardGraphsComponent } from './ccva-graphs.component';

describe('CcvaDashboardGraphsComponent', () => {
  let component: CcvaDashboardGraphsComponent;
  let fixture: ComponentFixture<CcvaDashboardGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcvaDashboardGraphsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaDashboardGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
