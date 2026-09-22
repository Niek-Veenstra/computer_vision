# Frontend project instructions

## Project

- This directory contains the Vue 3 frontend of the document portal. The NestJS backend lives in `../server`.
- Use TypeScript, Vue single-file components with `<script setup lang="ts">`, Pinia, Vue Router 5, Vite and Tailwind CSS 4.
- Never use nested ternary expressions. Treat them as an absolute no-go; use clear `if` statements or a named helper instead.
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
- Documents are loaded and saved through the authenticated NestJS `/documents` API in `src/fetch/documents.ts`. Updates include the current `version`; preserve unsaved local edits when the API returns a conflict.
- Documents are stored only through the backend API; do not add browser local storage for documents or legacy document imports.
- Keep persistence in the store/service layer rather than individual components. Do not silently discard saved content on load or save errors.

## Forms and validation

- For submitted data forms, define fields with `useFormField` and derive their values with `useFormFieldValues`.
- Keep each form's Zod schema in a feature-specific `src/validation/<feature>-validation.ts` file. Validate submitted values with `validateScheme`, show field errors with `setFieldErrors`, and send the validated data to the API.
- Match frontend rules such as required fields and length limits to the backend API contract.
- Search and filter inputs, read-only fields, confirmation actions and the autosaving document editor do not need a form schema unless they become submitted data forms.

## Verification and workflow

- Do not run frontend tests, builds, typechecks or validation commands other than direct ESLint checks. The user performs those checks.
- ESLint may be run directly through `node node_modules/eslint/bin/eslint.js` when relevant.
- Inspect the current files and Git diff before editing; preserve existing work, including untracked files.
- When asked to commit, inspect `git status --short` and `git diff --cached --name-status` immediately before committing; IDE staging may have changed since the last check.
- Group changes into small commits by purpose, such as dependencies, a feature, shared UI and routing. Give each commit a clear description of the resulting change. Avoid one large commit for unrelated work.
- Stage only the files needed for that commit. If other work is already staged, use explicit pathspecs with `git commit --only` so it stays staged; include a missing companion file only when the change needs it to work, and say which file was added.
- After each commit, inspect the committed file list. At the end, check Git status and report the commit hashes, what each commit contains, and any work left uncommitted. Never mix changes under `../server` into a frontend commit.
- After routing changes, leave route type generation and typechecking to the user.
- Validate route names, dynamic parameters, redirects, breadcrumb ancestry and existing links when restructuring pages.
- Review changed code and Git diffs without running validation commands. Report any checks as not run when handing work over.

## References

- [Vue Router file-based routing](https://router.vuejs.org/file-based-routing/)
- [Codex AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
