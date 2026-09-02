import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewVaComponent } from './view-va.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

describe('ViewVaComponent', () => {
  let component: ViewVaComponent;
  let fixture: ComponentFixture<ViewVaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewVaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewVaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// Constructed directly, without TestBed/template compilation - covers the
// Cause of Death fetch (loadCauseOfDeath), which only runs when the settings
// checkboxes (codOptions) enable it.
describe('ViewVaComponent - Cause of Death (unit)', () => {
  function makeComponent(getCauseOfDeath: jest.Mock = jest.fn()) {
    const listRecordsService = { getCauseOfDeath } as any;
    const component = new ViewVaComponent(
      {} as any,
      { va: 'va-1' },
      {} as any,
      {} as any,
      {} as any,
      listRecordsService
    );
    component.vaId = 'va-1';
    return { component, listRecordsService };
  }

  it('does not call the service when both CoD options are disabled', () => {
    const { component, listRecordsService } = makeComponent();
    component.codOptions = { include_ccva_default: false, include_pcva: false };

    (component as any).loadCauseOfDeath();

    expect(listRecordsService.getCauseOfDeath).not.toHaveBeenCalled();
    expect(component.codLoading).toBe(false);
  });

  it('fetches and stores the response when at least one option is enabled', () => {
    const response = { data: { ccva: { algorithm: 'InterVA5', cause1: 'Sepsis', probability: null }, pcva: null } };
    const { component, listRecordsService } = makeComponent(jest.fn().mockReturnValue(of(response)));
    component.codOptions = { include_ccva_default: true, include_pcva: false };

    (component as any).loadCauseOfDeath();

    expect(listRecordsService.getCauseOfDeath).toHaveBeenCalledWith('va-1', true, false);
    expect(component.codData).toEqual(response.data);
    expect(component.codLoading).toBe(false);
    expect(component.codError).toBe('');
  });

  it('sets an error message when the fetch fails, without leaving the loading state stuck', () => {
    const { component } = makeComponent(jest.fn().mockReturnValue(throwError(() => new Error('network down'))));
    component.codOptions = { include_ccva_default: false, include_pcva: true };

    (component as any).loadCauseOfDeath();

    expect(component.codLoading).toBe(false);
    expect(component.codError).toBe('Cause of Death could not be loaded.');
    expect(component.codData).toBeNull();
  });
});
