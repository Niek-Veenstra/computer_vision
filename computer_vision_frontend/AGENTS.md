# Frontend project instructions

## Project

- This directory contains the Vue 3 frontend of the document portal. The NestJS backend lives in `../server`.
- Use TypeScript, Vue single-file components with `<script setup lang="ts">`, Pinia, Vue Router 5, Vite and Tailwind CSS 4.
- Use npm and maintain `package-lock.json` when changing dependencies. On Windows, use `npm.cmd` in PowerShell.
- Communicate with the user in Dutch. Keep interface text in English to match the existing application.

## Pages and routing

- Routes are generated from `src/pages` by `vue-router/vite`, configured before the Vue plugin in `vite.config.ts`.
- Use lowercase route directories and `index.vue` for their overview pages. Example: `src/pages/documents/index.vue` maps to `/documents`.
- Use square brackets for dynamic parameters. Example: `src/pages/documents/[documentId].vue` maps to `/documents/:documentId`.
- A file alongside its matching directory, such as `src/pages/documents.vue`, is the parent layout. It must render `<RouterView />`.
- Put route names, redirects and breadcrumb metadata in a `<route lang="json">` block in the relevant page. Keep existing route names stable when moving files.
- Use descriptive Vue component names through `defineOptions`, such as `DocumentsPage`, even when the route file is named `index.vue`.
- Keep `src/router/index.ts` small: router creation, generated routes and route hot reloading. Do not maintain a second handwritten route list.
- `src/typed-router.d.ts` is generated. Regenerate it with the dev server or Vite build; do not edit it manually.
- Only route components belong in `src/pages`. Put reusable UI elsewhere so it does not become a route.

## Layout and UI

- All pages receive `PageContainer` through `AppContent`. It owns page width and outer spacing.
- Keep pages at the available width. Avoid page-specific `max-w-*`, `mx-auto` and duplicate outer padding; apply common spacing changes in `src/ui/layout/PageContainer.vue`.
- Individual controls and forms may have their own appropriate widths.
- Use `AppBreadcrumbs` and route metadata for navigation above the content. Document detail breadcrumbs display the document title.
- Reuse existing components from `src/components/ui`, icons from `lucide-vue-next`, and the theme tokens in `src/ui/style/App.css`.
- Keep feature components in `src/ui/<feature>`, shared layouts in `src/ui/layout`, data types in `src/domain`, and shared state in `src/stores`.
- Preserve keyboard navigation, accessible labels, responsive layouts and visible loading, empty and error states where applicable.

## Documents

- Use Tiptap for document editing and its JSON document model for content.
- Documents currently persist in browser local storage through `src/stores/documents.ts`. This is provisional browser storage, not backend or account synchronization.
- Keep persistence in the store/service layer rather than individual components. Do not silently discard saved content on load or save errors.

## Verification and workflow

- The user does not want agent tests or validation in the sandbox. Run builds, tests, lint and other verification commands directly outside the sandbox, using `require_escalated` when required by the execution environment. Do not try a sandboxed run first.
- Inspect the current files and Git diff before editing; preserve existing work, including untracked files.
- After routing changes, run `npm.cmd run build-only` to generate route types, then `npm.cmd run type-check`.
- Validate route names, dynamic parameters, redirects, breadcrumb ancestry and existing links when restructuring pages.
- Run ESLint on the files you changed. The repository's `npm.cmd run lint` scripts apply fixes across the repository, so use targeted checks when appropriate.
- Use focused tests for behavior with a meaningful regression risk. Avoid adding tests that only repeat markup or spacing classes.
- Report pre-existing verification failures separately from errors introduced by your changes; do not claim the complete build passes when only `build-only` passes.

## References

- [Vue Router file-based routing](https://router.vuejs.org/file-based-routing/)
- [Codex AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
