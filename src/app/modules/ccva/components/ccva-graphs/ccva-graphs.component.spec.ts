import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaGraphsComponent } from './ccva-graphs.component';

describe('CcvaGraphsComponent', () => {
  let component: CcvaGraphsComponent;
  let fixture: ComponentFixture<CcvaGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcvaGraphsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
