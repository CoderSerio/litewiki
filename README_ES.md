<p align="center">
  <h1 align="center">litewiki</h1>
  <p align="center">Una CLI local-first que genera informes estilo wiki para tu base de c&oacute;digo.</p>
</p>

<p align="center">
  <a href="https://github.com/CoderSerio/light-wiki"><img alt="repo" src="https://img.shields.io/badge/github-CoderSerio%2Flight--wiki-181717?logo=github&logoColor=white"></a>
  <a href="https://github.com/CoderSerio/light-wiki/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-ISC-blue"></a>
  <a href="https://github.com/CoderSerio/light-wiki/issues"><img alt="issues" src="https://img.shields.io/github/issues/CoderSerio/light-wiki"></a>
  <a href="https://github.com/CoderSerio/light-wiki/stargazers"><img alt="stars" src="https://img.shields.io/github/stars/CoderSerio/light-wiki"></a>
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white">
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README_ZH.md">中文</a>
</p>

## Caracter&iacute;sticas

- **CLI interactiva**: `wiki` abre un men&uacute; sencillo (`run`, `report`, `profile`, `config`).
- **Archivado de proyectos**: los informes generados se guardan en tu directorio de configuraci&oacute;n de usuario.
- **Modo incremental**: puede reutilizar el &uacute;ltimo informe archivado como entrada.
- **Agente con herramientas**: el agente explora tu repositorio mediante herramientas (`listDirectory`, `readFile`, `renderMermaid`).

## Instalaci&oacute;n

Requisitos:
- Node.js (ESM)
- pnpm (recomendado)

Instalar globalmente:

```bash
npm i -g litewiki
# o
pnpm add -g litewiki
```

Luego ejecuta:

```bash
wiki
```

## Instalaci&oacute;n para desarrollo

```bash
pnpm install
pnpm build
```

Luego ejecuta la CLI:

```bash
pnpm -s build
node dist/index.js
```

O enl&aacute;zala localmente (opcional):

```bash
pnpm link --global
wiki
```

## Inicio r&aacute;pido

1) Crear una configuraci&oacute;n de IA:

```bash
wiki config
```

Se te pedir&aacute;:
- `provider`: `openai | anthropic | google | custom` (**`openai` y `anthropic` funcionan actualmente**)
- `model`
- `baseUrl`
- `key`

2) Ejecutar:

```bash
wiki run .
```

## Proveedores

Intencionalmente **aplanamos** los proveedores a:

```ts
provider: "openai" | "anthropic" | "google" | "custom"
```

- **Soportados**: `openai`, `anthropic`
- **A&uacute;n no soportados (pero seleccionables en la UI)**: `google`, `custom`
- **Nota sobre Anthropic**: usa la API de Messages; establece `baseUrl` a `https://api.anthropic.com/v1/messages`.

Ver: [`docs/providers.md`](./docs/providers.md)

## Comandos

- `wiki`: men&uacute; interactivo
- `wiki run [dir]`: analizar un directorio
- `wiki profiles`: gestionar perfiles de prompt
- `wiki reports`: ver/eliminar informes archivados
- `wiki config`: gestionar configuraciones de IA

## Desarrollo

```bash
pnpm test
pnpm lint
pnpm format
pnpm build
pnpm dev
```

## Gu&iacute;a para agentes

Si est&aacute;s usando un agente de c&oacute;digo (Cursor/Copilot/etc.), consulta: [`AGENTS.md`](./AGENTS.md)

## Licencia

ISC &copy; Carbon
