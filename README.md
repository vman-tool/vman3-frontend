# Vman3 Frontend

This project uses Angular v20.


## Development server
```
Run 'git clone https://github.com/vman-tool/vman3-frontend' to copy the project local then,

Run 'cd vman3-frontend ' to change to the project directory,

Run 'npm install' to install dependencies then,

To install angular cli if not available 'npm install -g @angular/cli@20'

Run 'cp src/assets/config.json.sample src/assets/config.json' to create your local runtime config (see Configuration section below — required, the app will not load without it),

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

```
## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running Tests

Unit tests use [Jest](https://jestjs.io/) (migrated off the Angular CLI's
default Karma/Jasmine setup — Jest runs in Node via jsdom, so no browser is
needed, which is faster locally and is what makes it practical to run in
CI).

```bash
npm test              # single run - what CI runs
npm run test:watch    # re-runs on file change, while developing
npm run test:coverage # adds a coverage report (coverage/vman3-frontend/)
```

Spec files (`*.spec.ts`) live next to the file they test, following
Angular's convention. Most construct the class directly (e.g.
`new SomeComponent(mockDep1, mockDep2)`) rather than going through
Angular's `TestBed`/template compilation, since what's being tested is
component/service logic rather than rendered markup — this sidesteps a lot
of fragile template-compilation mocking (missing Material modules, unknown
child elements, etc.). Services that call `HttpClient` (e.g.
`ccva.service.spec.ts`) use `HttpTestingController` instead, to assert on
the exact outgoing requests.

`jest.config.ts` and `setup-jest.ts` at the project root wire up the
Angular-specific pieces (zone.js, template compilation, and a couple of
jsdom polyfills — `fake-indexeddb` and the Leaflet globals the real build
gets from `angular.json`'s `scripts` array) — you shouldn't need to touch
either when just adding a new spec file.

The same suite runs in CI (`.github/workflows/main.yml`) on every push/PR
to `main`, before the Docker image is built.

## Configuration
`src/assets/config.json` holds the runtime API URLs the app talks to. It is **gitignored** (it's environment-specific, same as the backend's `.env`) so it will **not** exist after a fresh clone — you must create it yourself every time you clone the repo:

```
cp src/assets/config.json.sample src/assets/config.json
```

The app fetches this file during startup, before it renders anything. If it's missing, the app fails to bootstrap and you'll get a blank white screen with no visible error.

By default `config.json.sample` points at a local backend on `http://localhost:8080`, which matches `start-dev.sh`. If your backend runs elsewhere, edit your local `config.json` (not the `.sample`) accordingly:

```
{
  "API_URL": "http://backend-url/vman/api/v1",
  "BASE_URL": "http://backend-url/",
  "API_URL_WS": "ws://backend-url/vman/api/v1/ws",
  "DOCUMENTATION_URL": "https://vman3.vatools.net/docs/"
}
```
