import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaGraphsPublicComponent } from './ccva-graphs.component';

describe('CcvaGraphsPublicComponent', () => {
  let component: CcvaGraphsPublicComponent;
  let fixture: ComponentFixture<CcvaGraphsPublicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcvaGraphsPublicComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaGraphsPublicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
