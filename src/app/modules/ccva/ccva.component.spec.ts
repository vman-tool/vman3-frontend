import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaComponent } from './ccva.component';

describe('CcvaComponent', () => {
  let component: CcvaComponent;
  let fixture: ComponentFixture<CcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcvaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
