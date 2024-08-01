import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PcvaComponent } from './pcva.component';

describe('PcvaComponent', () => {
  let component: PcvaComponent;
  let fixture: ComponentFixture<PcvaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PcvaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PcvaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
