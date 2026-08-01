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
