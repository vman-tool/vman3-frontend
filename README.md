# Vman3 Frontend

This project uses Angular v18.

## Development server
```
Run 'git clone https://github.com/vman-tool/vman3-frontend' to copy the project local then,

Run 'cd vman3-frontend ' to change to the project directory,

Run 'npm install' to install dependencies then,

To install angular cli if not available 'npm install -g @angular/cli@18'

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

```
## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Configuration
Set ```config.json``` inside assets folder located in ``` srs/assets/``` with value

```
{
  "API_URL": "http://backend-url",
  "API_URL_WS": "ws://backend-url/ws"
}

```

So that it runs in development mode.
