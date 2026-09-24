# computer_vision_frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```


## Reader targets

The document editor can insert a **Reader target** at the cursor position. Each
target is a persistent inline Tiptap `recognitionMarker` node with a UUID,
label and inline content. The normal document editor controls creation and
deletion of markers.

Any registered reader authenticates with `X-Scanner-Key` and can list marker subresources
without downloading the full document:

```http
GET /documents/{documentId}/markers
```

It can change only the content inside an existing marker:

```http
PATCH /documents/{documentId}/markers/{markerId}
Content-Type: application/json
X-Scanner-Key: scn_<scanner-api-key>

{
  "operationId": "1480d919-14eb-49d4-8f40-50cf5bd815c9",
  "version": 3,
  "content": [{ "type": "inlineMath", "value": "8-4=4" }]
}
```

An empty `content` array clears the marker content without deleting the marker.
There is no reader endpoint for creating or deleting markers. A `409 Conflict`
means the reader must fetch the marker list again. Repeating the latest
operation with the same `operationId` is safe. Inline math is rendered with
KaTeX after the editor loads the latest document version.
