# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GTSW is an enterprise Angular 21 + Ionic 8 web application with mobile support via Capacitor. The application features metadata-driven UI generation where the server provides page structure (grids, forms, tabs, toolbars) and the client renders dynamically.

## Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Development server (8GB node heap for large builds) |
| `npm run build` | Production build |
| `npm run watch` | Watch mode development build |
| `npm test` | Run Karma/Jasmine unit tests |
| `npm run lint` | ESLint on TypeScript and HTML files |
| `npm run generate:page` | Generate a new page using custom script |

## Architecture

### Data Flow

The central `GtsDataService` (src/app/core/services/gts-data.service.ts) orchestrates all data flow between:
- **Backend API**: HTTP calls to server
- **Components**: Grids, forms, toolbars
- **Page State**: Metadata, data, conditional rules

### Three Core Arrays

1. **metaData[]**: Page configuration/structure from server (pageFields, grids, forms, tabs, toolbars, actions, dataSets, sqls, condRules)
2. **pageData[]**: Runtime data from database (rows, selectedRows, selectedKeys, status: idle/insert/edit)
3. **pageRules[]**: Conditional rules controlling UI element visibility/behavior

### Communication Pattern

Components communicate via RxJS Subjects (listeners):
- `gridReloadListener` / `gridRowUpdateListener`: Grid data updates
- `gridSelectListener`: Row selection notifications
- `messageListener`: Dialogs/alerts
- `lookUpListener`: Lookup popups
- `formReqListener` / `formRepListener`: Form request/response
- `aiChatListener`: AI chat integration
- `appViewListener`: View changes
- `appLoaderListener`: Loading state

### Action System

`runAction(prjId, formId, objectName)` executes sequences defined in metadata. Key action types:
- Data: `getData`, `removeData`, `dsRefresh`, `dsRefreshSel`, `dsPost`, `dsDelete`
- UI State: `setView`, `setPreviousView`, `setRule`
- Dataset: `dsInsert`, `dsEdit`, `dsCancel`, `selectDS`, `unselectDS`
- Form: `getFormData`, `saveFormData`, `clearFields`, `pkLock`, `pkUnlock`
- Grid: `gridSetIdle`, `gridSetEdit`, `gridSetInsert`, `gridPostChanges`
- Messages: `showMsg`, `showOKCancel`
- AI: `gridSetAIMode`, `formAIAssist`

## Directory Structure

```
src/app/
├── core/
│   ├── gts-open-source/    # 17 reusable GTS components (AG Grid, PrimeNG, Ionic wrappers)
│   ├── services/           # Core services (gts-data.service.ts is the main orchestrator)
│   ├── models/             # TypeScript interfaces
│   ├── guards/             # Route guards
│   └── interceptors/       # HTTP interceptors
├── features/
│   ├── auth/               # Authentication pages
│   ├── GTSW/               # Main GTSuite features
│   ├── GTR/                # Report generation
│   └── ...                 # Other feature modules
```

## Key Libraries

- **AG Grid Community** (35.0): Data grids with virtual scrolling, filtering, sorting
- **PrimeNG** (21.0): Form components and UI widgets
- **Ionic** (8.0): Mobile-first UI components
- **Anthropic SDK** (0.71): Claude AI integration for chat and form assistance

## Component Stack

DevExtreme è stato completamente rimosso. I componenti GTS in `core/gts-open-source/` usano:
- **Grid**: AG Grid Community
- **Form**: PrimeNG
- **Tabs/Toolbar/Messages**: Ionic

## Component Conventions

- Selector prefix: `app-` (kebab-case for components)
- Directive prefix: `app` (camelCase)
- GTS components follow the pattern: `@Input() prjId`, `@Input() formId`, `@Input() objectName`
- Components are standalone (Angular 14+ style)

## Build Configuration

- Output directory: `/www` (Capacitor/Cordova compatible)
- Bundle budgets: 2.5MB warning, 5MB error (initial)
- Allowed CommonJS: exceljs, file-saver, crypto-js, quill, jspdf, marked
