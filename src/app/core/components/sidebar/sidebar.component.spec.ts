import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SidebarComponent } from './sidebar.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OBJECTSTORE_VA_QUESTIONS } from 'app/shared/constants/indexedDB.constants';
import { OBJECTKEY_ODK_QUESTIONS } from 'app/shared/constants/odk.constants';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidebarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// These construct the component directly, without TestBed/template
// compilation, so the mocks below are the component's only collaborators -
// no real HTTP call or indexedDB access is ever reached.
describe('SidebarComponent (unit)', () => {
  function makeComponent(overrides: {
    questionsResponse?: any;
    routerUrl?: string;
  } = {}) {
    const authService = {
      hasPrivilege: jest.fn().mockReturnValue(of(true)),
    } as any;
    const router = { url: overrides.routerUrl ?? '/dashboard' } as any;
    const vaRecordsService = {
      getQuestions: jest.fn().mockReturnValue(
        of(overrides.questionsResponse ?? { data: [{ name: 'id10019' }] })
      ),
    } as any;
    const indexedDBService = {} as any;
    const genericIndexedDBService = {
      addDataAsObjectValues: jest.fn().mockResolvedValue(undefined),
      addDataAsIs: jest.fn().mockResolvedValue(undefined),
    } as any;

    const instance = new SidebarComponent(
      authService,
      router,
      vaRecordsService,
      indexedDBService,
      genericIndexedDBService
    );

    return { instance, authService, router, vaRecordsService, genericIndexedDBService };
  }

  describe('ngOnInit question cache refresh', () => {
    // Regression coverage: this used to only refresh the local IndexedDB
    // question cache when it was empty, so a browser with an existing
    // (possibly stale) cache never picked up new fields like isadult/
    // ischild/instanceid reported later by the backend. It must now refresh
    // unconditionally on every load - see sidebar.component.ts.
    it('writes the fetched questions to IndexedDB even though nothing checks for an existing cache first', async () => {
      const data = [{ name: 'isadult' }, { name: 'ischild' }, { name: 'instanceid' }];
      const { instance, genericIndexedDBService } = makeComponent({ questionsResponse: { data } });

      await instance.ngOnInit();

      expect(genericIndexedDBService.addDataAsObjectValues).toHaveBeenCalledWith(
        OBJECTSTORE_VA_QUESTIONS,
        data
      );
      expect(genericIndexedDBService.addDataAsIs).toHaveBeenCalledWith(
        OBJECTSTORE_VA_QUESTIONS,
        OBJECTKEY_ODK_QUESTIONS,
        data
      );
    });

    it('does not touch IndexedDB when the backend returns no data', async () => {
      const { instance, genericIndexedDBService } = makeComponent({ questionsResponse: {} });

      await instance.ngOnInit();

      expect(genericIndexedDBService.addDataAsObjectValues).not.toHaveBeenCalled();
      expect(genericIndexedDBService.addDataAsIs).not.toHaveBeenCalled();
    });
  });

  describe('getCollapsedRoute', () => {
    it('appends the first submenu route when the menu item has submenus', () => {
      const { instance } = makeComponent();
      const menuItem = { route: '/settings', subMenuItems: [{ route: '/users' }] };

      expect(instance.getCollapsedRoute(menuItem)).toBe('/settings/users');
    });

    it('returns the route as-is when there are no submenus', () => {
      const { instance } = makeComponent();
      const menuItem = { route: '/dashboard' };

      expect(instance.getCollapsedRoute(menuItem)).toBe('/dashboard');
    });
  });

  describe('hasAccess', () => {
    it('forwards the privilege list to AuthService and returns its result', async () => {
      const { instance, authService } = makeComponent();
      authService.hasPrivilege.mockReturnValue(of(false));

      const result = await instance.hasAccess(['users:view']);

      expect(authService.hasPrivilege).toHaveBeenCalledWith(['users:view']);
      expect(result).toBe(false);
    });
  });
});
