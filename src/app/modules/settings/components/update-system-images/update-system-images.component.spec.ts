import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateSystemImagesComponent } from './update-system-images.component';

describe('UpdateSystemImagesComponent', () => {
  let component: UpdateSystemImagesComponent;
  let fixture: ComponentFixture<UpdateSystemImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateSystemImagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateSystemImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
