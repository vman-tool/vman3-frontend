import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcvaPublicComponent } from './ccva-public.component';

describe('CcvaPublicComponent', () => {
  let component: CcvaPublicComponent;
  let fixture: ComponentFixture<CcvaPublicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcvaPublicComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcvaPublicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
