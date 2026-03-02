# GTSW Metadata System - Complete Documentation

## Overview
GTSW is a metadata-driven web application. The server provides page structure (metadata) and the client dynamically renders UI and executes business logic based on it. This document explains the entire data architecture and action system.

---

## 1. Core Data Structures

The `GtsDataService` maintains 4 private arrays that hold all runtime state:

### 1.1 metaData[] - Page Configuration & Structure
Each entry represents one loaded page:
```
metaData[n] = {
  prjId: string,          // Project ID (e.g., "GTSW", "WFS", "GTR")
  formId: number,         // Unique form/page ID
  pageData: {
    page: {
      initAction: string  // Action to run when page loads (e.g., "initPage")
    },
    views: [{
      viewName: string,        // View identifier (e.g., "mainView", "detailView")
      viewStyle: string,       // CSS class for the view
      viewFlagAlwaysActive: boolean,  // If true, objects appear in ALL views
      objects: [{
        objectName: string,    // Component identifier
        objectType: string,    // "grid", "form", "toolbar", "tabs"
        visible: boolean,
        condRules: [{Id: number, Value: number}]  // Conditional visibility rules
      }]
    }],
    actions: [{
      objectName: string,      // Action name (e.g., "initPage", "saveRecord")
      actions: [{              // Ordered steps in the action sequence
        actionType: string,    // See Section 3 for all types
        // ... action-specific properties
        execCond: [{Id: number, Value: number}]  // Conditional execution rules
      }]
    }],
    dataSets: [{
      dataSetName: string,     // Dataset identifier (e.g., "qCustomers")
      dataAdapterName: string, // Parent adapter name (e.g., "daCustomers")
      sqlId: number,           // SQL for SELECT/refresh
      sqlInsertId: number,     // SQL for INSERT
      sqlUpdateId: number,     // SQL for UPDATE
      sqlDeleteId: number,     // SQL for DELETE
      sqlKeys: [{keyField: string}],  // Primary key field(s)
      filterObject: {},        // Client-side filter on rows
      opFieldName: string      // PageField to store operation result
    }],
    pageFields: [{
      pageFieldName: string,   // Unique field identifier (e.g., "gtsFldqCustomers_name")
      dbFieldName: string,     // Database column name (e.g., "name")
      dataSetName: string,     // Parent dataset (e.g., "qCustomers")
      pageFieldLabel: string,  // Display label
      dataType: string,        // Data type
      fieldType: string,       // Field type (e.g., "Check")
      fieldOptions: string|any[], // Options for Check fields: [{value, checked}]
      value: any               // Current runtime value
    }],
    forms: [{
      groupId: number,         // Form group ID (clFldGrpId)
      formName: string,        // Form name
      fields: [{
        objectName: string,    // Maps to pageFieldName
        fieldName: string,     // Display name
        editorType: string,    // "TextBox", "CheckBox", "DropDownBox", "DateBox", etc.
        isPK: boolean,         // Is primary key field
        readOnly: boolean,
        disabled: boolean,
        value: any,
        valueChecked: string,  // Value when checkbox is checked
        valueUnchecked: string,// Value when checkbox is unchecked
        sqlId: number,         // For DropDownBox: SQL to load options
        dropDownRows: any[],   // Loaded dropdown options
        details: [{            // Sub-fields (detail rows)
          pageFieldName: string,
          value: any
        }]
      }]
    }],
    grids: [{
      objectName: string,      // Grid identifier
      dataSetName: string,
      changeArray: any[],      // Pending grid edits [{type, dataParams, keyParams}]
      columns: [{
        field: string,
        headerName: string,
        visible: boolean,
        editable: boolean,
        summaryType: string,   // "Sum", "Count", "Avg", "Min", "Max"
        summaryProductCol: string,
        summaryWeightCol: string,
        mask: string           // Number format (e.g., "#,###.00")
      }]
    }],
    toolbars: [{
      objectName: string,
      actionTarget: string,    // Links to another toolbar's button
      itemsList: [{
        objectName: string,
        type: string,          // "button", "title", "field", "dropDownButton"
        actionName: string,    // Action to run on click
        dataSet: string,       // Referenced dataset
        pageFieldName: string, // Referenced pageField
        enabled: boolean,      // Maps to !disabled in component
        text: string,
        icon: string
      }]
    }],
    tabs: [{
      objectName: string,
      tabIndex: number,        // 1-based index
      tabItems: [{
        tabText: string,
        visible: boolean
      }]
    }],
    condRules: [{
      condId: number,          // Rule identifier
      condValue: number,       // Default value
      dataSetName: string,     // If set, rule updates on row selection
      fieldName: string,       // DB field that drives the rule
      fieldValues: string[],   // Possible field values (semicolon-separated groups)
      dataSetCondValues: number[] // Corresponding condValue for each fieldValue
    }],
    sqls: [{
      sqlId: number,           // SQL identifier
      sqlType: string,         // "SQL" or "PROC" or "MONGO"
      sqlText: string,         // The actual query/procedure
      sqlParams: [{            // Parameter definitions
        paramName: string,
        paramType: string,     // "IN", "OUT", "INOUT"
        dbType: string
      }]
    }],
    customMsg: string          // Temporary message storage for showMsg after execCustom
  }
}
```

### 1.2 pageData[] - Runtime Data (Rows)
Each entry represents data loaded from a database query:
```
pageData[n] = {
  prjId: string,
  formId: number,
  dataAdapter: string,       // Adapter name (e.g., "daCustomers")
  data: [{
    dataSetName: string,     // Dataset name (e.g., "qCustomers")
    rows: any[],             // Array of data rows from DB
    selectedRows: any[],     // Currently selected row(s) [usually 1]
    selectedKeys: any[],     // Key values of selected row(s) [{PK_FIELD: value}]
    selectedKeysString: string, // Serialized keys "val1,val2;val3,val4"
    status: string,          // "idle" | "insert" | "edit" | "delete"
    sqlParams: any[],        // SQL parameters (from dsInsert/dsEdit)
    queryParams: any[],
    doc: any,                // Document data (for MongoDB operations)
    sqlType: string,         // "SQL" | "MONGO"
    metaData: any[],         // Column metadata from server (dbType, etc.)
    outBinds: any[]          // Output binds from INSERT (RETURNING clause)
  }]
}
```

### 1.3 pageRules[] - Conditional Rules State
Controls visibility and behavior of UI elements:
```
pageRules[n] = {
  prjId: string,
  formId: number,
  condId: number,            // Rule identifier
  condValue: number          // Current value (matched against object.condRules)
}
```

**How rules work:**
- Each UI object has `condRules: [{Id: 1, Value: 2}]`
- The system checks: `pageRules[condId=1].condValue === 2`
- If ALL condRules match → object is visible/active
- If ANY condRule doesn't match → object is hidden/inactive

### 1.4 dbLog[] - Operation Log
Tracks all database operations for debugging:
```
dbLog[n] = {
  logDate: Date,
  prjId: string,
  formId: number,
  route: string,             // e.g., "db/execProc"
  action: string,            // e.g., "dsPost", "getData"
  sqlId: number,
  dataAdapter: string,
  dataSetAction: string,     // "insert", "edit", "delete"
  dataSetName: string,
  params: any,
  connCode: string,
  user: string
}
```

---

## 2. Listener System (RxJS Subjects)

Components communicate via Subjects. The service emits events, components subscribe.

| Listener | Type | Purpose |
|----------|------|---------|
| `appViewListener` | `Subject<string>` | View changes (triggers UI re-render) |
| `pageCustomListener` | `Subject<{customCode, actionName?}>` | Custom code execution in page components |
| `appLoaderListener` | `Subject<boolean>` | Show/hide loading spinner |
| `fileLoaderListener` | `Subject<any>` | File upload status |
| `formReqListener` | `Subject<any>` | Form request to page (EXIT, GRID_ROW_DATA) |
| `formRepListener` | `Subject<any>` | Form reply from page |
| `lookUpListener` | `Subject<any>` | Open lookup popup |
| `gridSelectListener` | `Subject<any>` | Grid row selection notification |
| `formFocusListener` | `Subject<boolean>` | Set focus on form |
| `gridReloadListener` | `Subject<string>` | Grid reload (by dataSetName). Also carries flags: `"dataSetName;Edit:true"` |
| `gridRowUpdateListener` | `Subject<{dataSetName, rowData, keyFields}>` | Update single grid row (no full reload) |
| `tabsRulesListener` | `Subject<string>` | Tabs visibility rules updated |
| `messageListener` | `Subject<any>` | Show message dialog (info, error, question) |
| `formExternalListener` | `Subject<any>` | External data update for forms (clearFields) |
| `formReloadListener` | `Subject<number>` | Reload form by groupId |
| `toolbarEventListener` | `Subject<any>` | Toolbar events (dropdown selection, etc.) |
| `actionEventListener` | `Subject<any>` | Debug action events |
| `aiChatListener` | `Subject<any>` | Open AI chat for grid/form assistance |
| `dbErrorListener` | `Subject<{title, message}>` | Database error display |
| `aiDataReceivedListener` | `Subject<any>` | AI-generated data for grid/form population |

---

## 3. Action Types Reference

Actions are sequences of steps executed by `runAction(prjId, formId, objectName)`. Each step has an `actionType` and is executed in order. If `actionCanRun` becomes `false`, the loop stops.

Each action step can have `execCond` (conditional execution based on `pageRules`).

### 3.1 Data Loading

#### `getData`
Loads data from server into `pageData[]`.
```
Properties: dataAdapter, sqlParams (with pageField references)
Behavior:
  1. Builds params from pageFields via buildParamsArray()
  2. Calls server: POST db/getData
  3. Creates/updates entry in pageData[] with rows
  4. Updates pageFields with values from first row
  5. Emits gridReloadListener for each dataSetName
Sets: actionCanRun = true/false based on server response
```

#### `removeData`
Removes a dataAdapter entry from `pageData[]`.
```
Properties: dataAdapter
Behavior: Splices entry from pageData array
Sets: actionCanRun = true
```

#### `dsRefresh`
Reloads ALL rows for a dataset from server.
```
Properties: dataSetName
Behavior: Fetches fresh data, replaces all rows, triggers grid reload
Sets: actionCanRun = true/false
```

#### `dsRefreshSel`
Reloads ONLY the selected row from server (preserves other rows).
```
Properties: dataSetName
Behavior: Fetches row by selectedKeys, updates in-place, emits gridRowUpdate
Sets: actionCanRun = true/false
```

### 3.2 View & Navigation

#### `setView`
Changes the current view (shows/hides UI components).
```
Properties: viewName
Behavior:
  1. Stores current view in previousView stack
  2. Sets actualView = viewName
  3. Updates visibility of all objects based on view + condRules
  4. Emits appViewListener
Sets: actionCanRun = true
```

#### `setPreviousView`
Returns to the previous view (pops from stack).
```
Properties: none
Behavior: Pops previousView stack, calls setView with that value
Sets: actionCanRun = true
```

### 3.3 Dataset Selection

#### `selectDS`
Marks a dataset as "selected" (first row or current selection).
```
Properties: dataSetName
Behavior: setDataSetSelected(selected=true) → updates selectedRows, selectedKeys, pageFields
Sets: actionCanRun = true
```

#### `unselectDS`
Clears dataset selection.
```
Properties: dataSetName
Behavior: setDataSetSelected(selected=false) → clears selectedRows, selectedKeys, resets pageFields
Sets: actionCanRun = true
```

#### `goToFirstRow`
Selects the first row in a dataset.
```
Properties: dataSetName
Sets: actionCanRun = true
```

#### `goToLastRow`
Selects the last row in a dataset.
```
Properties: dataSetName
Sets: actionCanRun = true
```

#### `getSelectedKeys`
Builds a serialized string of selected rows' primary keys.
```
Properties: dataSetName
Behavior: Creates selectedKeysString = "pk1,pk2;pk3,pk4" format
Sets: actionCanRun = true
```

### 3.4 Dataset State (CRUD)

#### `dsInsert`
Sets dataset status to "insert" mode.
```
Properties: dataSetName, sqlParams, queryParams, doc, sqlType
Behavior: Sets status='insert' on the dataset entry in pageData
```

#### `dsEdit`
Sets dataset status to "edit" mode.
```
Properties: dataSetName, sqlParams, queryParams, doc, sqlType
Behavior: Sets status='edit' on the dataset entry in pageData
```

#### `dsCancel`
Resets dataset status to "idle" (cancels insert/edit).
```
Properties: dataSetName
Behavior: Sets status='idle'
```

#### `dsPost`
Saves form data to database (INSERT or UPDATE based on current status).
```
Properties: dataSetName, clFldGrpId, sqlParams, sqlType
Behavior:
  1. Reads status from dataset (insert/edit)
  2. Calls saveFormData() to copy form values → pageFields
  3. Gets appropriate sqlId (sqlInsertId or sqlUpdateId)
  4. Builds params from pageFields
  5. Calls execProc to execute SQL
  6. On INSERT success: processes outBinds, refreshes row from DB
  7. Resets status to 'idle'
  8. Emits gridReloadListener
Sets: actionCanRun = true/false
```

#### `dsDelete`
Deletes the selected row from database.
```
Properties: dataSetName, clFldGrpId, sqlParams, sqlType
Behavior:
  1. Calls saveFormData with status='delete'
  2. Gets sqlDeleteId
  3. Executes SQL
  4. On success: calls unselectDS to clear selection
  5. Emits gridReloadListener
Sets: actionCanRun = true/false
```

### 3.5 Grid Operations

#### `gridSetIdle`
Returns grid to read-only mode.
```
Properties: dataSetName
Behavior: Emits gridReloadListener("dataSetName;Idle:true")
```

#### `gridSetEdit`
Enables inline grid editing.
```
Properties: dataSetName
Behavior: Emits gridReloadListener("dataSetName;Edit:true")
```

#### `gridSetInsert`
Enables grid insert mode.
```
Properties: dataSetName
Behavior: Emits gridReloadListener("dataSetName;Insert:true")
```

#### `gridAllowDelete`
Enables delete button/capability on grid.
```
Properties: dataSetName
Behavior: Emits gridReloadListener("dataSetName;Delete:true")
```

#### `gridLockRows`
Prevents row selection changes (during edit operations).
```
Properties: dataSetName
Behavior: Emits gridReloadListener("dataSetName;Lock:true")
```

#### `gridUnLockRows`
Restores row selection capability.
```
Properties: dataSetName
Behavior: Emits gridReloadListener("dataSetName;Lock:false")
```

#### `setGridSelected`
Triggers grid to select current row programmatically.
```
Properties: dataSetName
Behavior: Emits gridReloadListener("dataSetName;Select:true")
```

#### `gridPostChanges`
Saves all pending grid inline edits to database.
```
Properties: dataSetName, gridName
Behavior: Iterates grid.changeArray, executes INSERT/UPDATE/DELETE for each change
Sets: actionCanRun = true/false
```

#### `gridRollback`
Discards pending grid changes (placeholder).
```
Properties: none
Sets: actionCanRun = true
```

### 3.6 Form Operations

#### `getFormData`
Populates form fields from pageFields values.
```
Properties: clFldGrpId (form group ID)
Behavior: Copies pageField.value → form.field.value for all fields in the group
```

#### `reloadFormData`
Same as getFormData but also notifies form component to refresh.
```
Properties: clFldGrpId
Behavior: getFormData() + emits formReloadListener(clFldGrpId)
```

#### `saveFormData`
Copies form field values back to pageFields (without database save).
```
Properties: clFldGrpId
Behavior: Copies form.field.value → pageField.value, handles CheckBox conversion
```

#### `getExportedData`
Loads dropdown/lookup data for form fields.
```
Properties: clFldGrpId
Behavior: Fetches data for DropDownBox fields with sqlId
```

#### `clearFields`
Resets all form fields to null.
```
Properties: clFldGrpId
Behavior: Sets value=null on all fields and pageFields for the form group
```

#### `pkLock`
Makes primary key fields read-only (during edit mode).
```
Properties: clFldGrpId
Behavior: Sets readOnly=true on all isPK fields
```

#### `pkUnlock`
Makes primary key fields editable (during insert mode).
```
Properties: clFldGrpId
Behavior: Sets readOnly=false on all isPK fields
```

### 3.7 Rules & Conditions

#### `setRule`
Sets a conditional rule value.
```
Properties: condId, condValue
Behavior: Updates pageRules[condId].condValue = condValue
Effect: Changes visibility/behavior of all objects with this condRule
```

#### `setTabsRules`
Updates tab visibility rules.
```
Properties: tabsName, tabsRules
Behavior: Updates tab visibility, emits tabsRulesListener
```

### 3.8 SQL Execution

#### `execProc`
Executes a stored procedure or SQL statement.
```
Properties: sqlId, sqlParams (with pageField references)
Behavior:
  1. Builds params from pageFields
  2. Calls server: POST db/execProc
  3. Processes outBinds (output parameters) → updates pageFields
  4. Handles errors via dbErrorListener
Sets: actionCanRun = true/false
```

### 3.9 Messages & Dialogs

#### `showMsg`
Shows an information/warning/error message dialog.
```
Properties: msgType ("I"=info, "E"=error, "W"=warning, "M"=message), msgTitle, msgText, msgField
Behavior:
  1. Reads customMsg from metaData if msgField references it
  2. Emits messageListener
  3. Pauses action loop until user clicks CLOSE
  4. Resumes action loop after close
Sets: actionCanRun = true (after close)
```

#### `showOKCancel`
Shows a question dialog with OK/Cancel buttons.
```
Properties: msgType ("Q"=question), msgTitle, msgText
Behavior:
  1. Emits messageListener
  2. Pauses action loop until user clicks OK or Cancel
  3. If OK → resumes loop (actionCanRun = true)
  4. If Cancel → stops loop (actionCanRun = false)
```

### 3.10 Custom Code & Integration

#### `execCustom`
Triggers custom TypeScript code in the page component.
```
Properties: customCode, actionName (optional)
Behavior:
  1. Emits pageCustomListener with {customCode, actionName}
  2. Page component handles the customCode in its subscriber
  3. If actionName is set, the page auto-runs that action AFTER custom code completes
  4. Action loop does NOT wait for custom code (async by nature)
Note: Loader is NOT hidden after execCustom (page component handles it)
```

#### `setField`
Sets a pageField value directly from metadata.
```
Properties: pageFldName, fieldValue
Behavior:
  1. If field is Check type with fieldOptions → converts string to boolean
  2. Sets pageField.value = fieldValue
Sets: actionCanRun = true
```

### 3.11 AI Integration

#### `gridSetAIMode`
Opens AI chat for importing data into a grid.
```
Properties: customCode (chat prompt code), dataSetName, gridName, clFldGrpId
Behavior: Emits aiChatListener with grid context
```

#### `formAIAssist`
Opens AI chat for form field auto-completion.
```
Properties: customCode (chat prompt code), clFldGrpId
Behavior: Emits aiChatListener with form context
```

---

## 4. Key Methods

### 4.1 Page Lifecycle

#### `runPage(prjId, formId)`
Entry point when navigating to a page.
1. Resets actualView
2. Calls `runGtsPage()` which:
   - Loads metadata from server if not cached (`getPageData2`)
   - Processes `viewFlagAlwaysActive` views
   - Stores in `metaData[]`
   - Initializes `pageRules[]`
   - Loads dropdown data for forms
   - Runs `initAction` (the page's startup action sequence)
   - Sets `customServerUrl` from project info
3. Emits `appViewListener`

### 4.2 Action Loop

#### `runAction(prjId, formId, objectName, iStart, debugLevel)`
Core engine that executes action sequences.
1. Finds action by `objectName` in `metaData[].pageData.actions`
2. Sets `actionCanRun = true`
3. Shows loader
4. Iterates through `action.actions[]` steps:
   - Checks `execCond` rules for each step
   - Executes the step based on `actionType`
   - If `actionCanRun = false` → breaks loop
5. Hides loader (unless last action was `execCustom`)

### 4.3 Data Methods

#### `buildParamsArray(prjId, formId, element)`
Builds SQL parameter values from pageFields.
- Reads `element.sqlParams` array
- For each param, finds the matching pageField and gets its current value
- Returns `{paramName: value}` object

#### `setSelectedRows(prjId, formId, dataAdapter, dataSetName, rows, keys)`
Updates selection state AND syncs all related pageFields.
1. Sets `selectedRows` and `selectedKeys` on the dataset
2. Updates ALL pageFields where `dataSetName` matches with values from the selected row
3. Emits `gridSelectListener`

#### `setDataSetSelected(prjId, formId, dataSetName, selected, first, last)`
High-level selection control.
- `selected=true`: selects first/last/current row, updates pageFields
- `selected=false`: clears selectedRows, selectedKeys, resets pageField values to null

#### `setPageDataSetRule(prjId, formId, dataAdapter, dataSetName)`
Updates conditional rules based on selected row values.
- Reads condRules that reference this dataSetName
- Matches selected row field values against condRule.fieldValues
- Sets the corresponding condValue

### 4.4 Server Communication

#### `postServerData(apiRoute, url, params)`
Base HTTP POST method. Routes:
- `data` → `/api/data/`
- `db` → `/api/db/`
- `file` → `/api/files/`
- `auth` → `/api/user/`
- `mail` → `/api/mail/`
- `setup` → `/api/setup/`
- `task` → `/api/task/`
- `prj` → `/api/prj/`

#### `execMethod(apiRoute, methodName, params, useCustomServer)`
Flexible method execution.
- `useCustomServer=false`: Uses standard server via `postServerData`
- `useCustomServer=true`: Uses project's `customServerUrl` + `/api/` + route
- Returns server response directly

#### `execProc(prjId, formId, sqlId, params, sqlParams, dataSet)`
Executes SQL procedures.
1. Calls server: `POST db/execProc`
2. Processes output binds (RETURNING clause values)
3. Updates pageFields with outBind values
4. Handles errors

---

## 5. Data Flow Diagrams

### 5.1 Page Load
```
User navigates → runPage(prjId, formId)
  → Server: getPageData2 → returns metadata JSON
  → metaData[].push({prjId, formId, pageData})
  → pageRules[].push(condRules)
  → runAction(prjId, formId, "initAction")
    → getData → Server: db/getData → pageData[].push(rows)
    → setView("mainView") → appViewListener → components render
```

### 5.2 Row Selection (Grid → Form)
```
User clicks grid row
  → Grid component calls setSelectedRows()
    → pageData[].selectedRows = [row]
    → pageData[].selectedKeys = [{PK: value}]
    → pageFields[].value = row[dbFieldName]  (for all fields in dataset)
    → gridSelectListener → toolbar updates enabled state
  → setPageDataSetRule() → updates condRules → view re-evaluates visibility
```

### 5.3 Edit & Save (Form → Database)
```
Action sequence: "editRecord"
  → selectDS → marks dataset selected
  → dsEdit → sets status='edit'
  → pkLock → PK fields become readOnly
  → getFormData → copies pageField values to form fields
  → setView("editView") → shows form

User edits fields → form component updates field.value

Action sequence: "saveRecord"
  → dsPost
    → saveFormData() → copies form.value → pageField.value
    → buildParamsArray() → reads pageField values → SQL params
    → execProc(sqlUpdateId) → Server: UPDATE
    → dsRefreshSel → reloads row from DB
    → gridReload → grid shows updated data
  → dsCancel → status='idle'
  → setPreviousView → back to grid view
```

### 5.4 Custom Code with Async Continuation
```
Action sequence: "runCustomProcess"
  → execCustom {customCode: "PROCESS_DATA", actionName: "showResult"}
    → pageCustomListener emits {customCode, actionName}
    → Page subscriber handles "PROCESS_DATA":
      → await execMethod(...) → custom server call
      → setCustomMsg() → stores result message
      → (subscriber ends)
      → if event.actionName → runAction("showResult")
        → showMsg → displays the stored customMsg

Action sequence: "showResult"
  → showMsg {msgField: "customMsg"} → reads metaData.customMsg → shows dialog
```

### 5.5 Message Dialog Flow
```
showMsg: Pauses action loop → shows dialog → user clicks Close → resumes loop
showOKCancel: Pauses → shows dialog → OK resumes (actionCanRun=true) / Cancel stops (actionCanRun=false)

Technical detail:
  1. First call: actualMessageStatus = 'idle' → sets to 'showMsg', emits messageListener, returns false
  2. Action loop breaks (actionCanRun=false)
  3. Message component shows dialog
  4. User clicks button → sets actualMessageStatus to 'OK'/'Cancel'/'Close'
  5. Message component calls runAction again with iLoop (restart index)
  6. Second call: actualMessageStatus = 'OK' → returns true, loop continues
```

---

## 6. Conditional Rules System

Rules control visibility and execution of UI elements and action steps.

### Setting Rules
- `setRule` action: directly sets `condId` to `condValue`
- `setPageDataSetRule`: automatically sets rules based on selected row field values
- Rules in `condRules` metadata with `dataSetName` are auto-evaluated on row selection

### Checking Rules
- Every UI object can have `condRules: [{Id: 1, Value: 2}, {Id: 3, Value: 1}]`
- `checkPageRule()` verifies ALL rules match (AND logic)
- Object is visible/active only when all its condRules match current pageRules

### Example
```
condRules metadata:
  {condId: 1, dataSetName: "qCustomers", fieldName: "status",
   fieldValues: ["A;B", "C"], dataSetCondValues: [1, 2]}

When user selects row with status="A" → condId 1 gets condValue 1
When user selects row with status="C" → condId 1 gets condValue 2

UI object with condRules: [{Id: 1, Value: 1}]
→ Visible when status is "A" or "B", hidden when status is "C"
```

---

## 7. GridReloadListener Flag Protocol

The `gridReloadListener` uses a string protocol to communicate commands:

| Message | Meaning |
|---------|---------|
| `"qDataSet"` | Full reload of dataset rows |
| `"qDataSet;Edit:true"` | Enable inline editing |
| `"qDataSet;Insert:true"` | Enable insert mode |
| `"qDataSet;Idle:true"` | Return to read-only |
| `"qDataSet;Delete:true"` | Enable delete capability |
| `"qDataSet;Lock:true"` | Lock row selection |
| `"qDataSet;Lock:false"` | Unlock row selection |
| `"qDataSet;Select:true"` | Programmatic row selection |

Grid component parses the string: `dataSetName = msg.split(';')[0]`, flags from remaining parts.

---

## 8. Common Action Sequences (Patterns)

### Pattern: Master-Detail Page Init
```
initPage:
  1. getData (daMain)           → loads main grid data
  2. setView ("mainView")       → shows grid
```

### Pattern: Select Row & Show Detail
```
selectRecord:
  1. selectDS (qMain)           → marks selected
  2. getData (daDetail)         → loads detail data using PK from pageFields
  3. setRule (condId:1, val:1)  → enables detail-specific UI
  4. setView ("detailView")     → shows detail form/grid
```

### Pattern: Insert New Record
```
newRecord:
  1. clearFields (grpId:1)      → empties form
  2. dsInsert (qMain)           → sets status='insert'
  3. pkUnlock (grpId:1)         → PK fields editable
  4. setView ("editView")       → shows form

saveNewRecord:
  1. dsPost (qMain, grpId:1)    → INSERT + refresh
  2. dsCancel (qMain)           → status='idle'
  3. gridSetIdle (qMain)        → grid back to read-only
  4. setPreviousView             → back to grid
```

### Pattern: Edit Existing Record
```
editRecord:
  1. dsEdit (qMain)             → status='edit'
  2. pkLock (grpId:1)           → PK readOnly
  3. getFormData (grpId:1)      → populate form from pageFields
  4. setView ("editView")       → show form

saveRecord:
  1. dsPost (qMain, grpId:1)    → UPDATE + refresh
  2. dsCancel (qMain)           → status='idle'
  3. setPreviousView             → back
```

### Pattern: Delete with Confirmation
```
deleteRecord:
  1. showOKCancel ("Confirm delete?")  → if Cancel → stops
  2. dsDelete (qMain, grpId:1)         → DELETE
  3. dsRefresh (qMain)                 → reload grid
  4. showMsg ("Record deleted")        → info message
```

### Pattern: Async Custom Code with Continuation
```
runProcess:
  1. execCustom {customCode:"RUN_PROCESS", actionName:"processResult"}

processResult:
  1. showMsg {msgType:"I", msgField:"customMsg"}
```

### Pattern: Conditional Actions
```
smartSave:
  1. dsPost (qMain, grpId:1)                    → always runs
  2. showMsg ("Saved!") {execCond:[{Id:5, Val:1}]} → only if rule 5 = 1
  3. dsRefresh (qMain) {execCond:[{Id:5, Val:2}]}  → only if rule 5 = 2
```

---

## 9. SQLite to MongoDB Upload Mapping

The desktop client stores metadata in SQLite tables. When uploaded via `POST /loadPage2`, the server controller (`gts-sqlite2.mjs`) reads all SQLite tables and combines them into a single `GtsPages` MongoDB document per form, plus separate `GtsSQL` and `GtsReports` collection entries.

### 9.1 Upload Pipeline (Middleware Chain)

The route executes these steps in order:
```
openConn → removePageData → loadPageData → loadTabsData → loadToolbarsData →
loadViewsData → loadActionsData → loadDataAdaptersData → loadGridsData →
loadPageFieldsData → loadExecCondRulesData → loadFormsData → loadMessagesData →
loadReportsData → loadSQLData → completeActions → closeConn
```

### 9.2 GtsForms → `page` (root of GtsPages document)

| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| PRJ_ID | prjId | Project identifier |
| FORM_ID | formId | Unique form/page ID |
| FORM_TITLE | pageTitle | Page title |
| FORM_NAME | formName | Form name identifier |
| INIT_ACTION | initAction | Action to run on page load |
| FORM_URL | formUrl | URL/route for the page |

### 9.3 GtsTabs + GtsTabsHdr → `tabs[]`

**GtsTabsHdr** (header, one per tab group):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| TABS_NAME | objectName | Tab group identifier |
| TABS_GRID_AREA | gridArea | CSS grid area placement |

**GtsTabs** (individual tabs → `tabs[].tabsData[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| TAB_ORDER_LOGIC | tabId | Tab order (1-based) |
| ICON_ID | iconId | Icon identifier |
| VISIBLE | visible | 'Y' → true |
| DISABLED | disabled | 'Y' → true |
| ACTION_NAME | actionName | Action to run on tab click |
| TEXT | text | Tab label |
| TAB_RN | tabRn | Row number |

### 9.4 GtsToolbar + GtsToolbarItems + GtsButtons → `toolbars[]`

**GtsToolbar** (header):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| TOOLBAR_NAME | objectName | Toolbar identifier |
| TOOLBAR_DESCR | objectDescr | Description |
| TOOLBAR_ID | toolbarId | Numeric ID |
| TOOLBAR_CSS_CLASS | cssClass | CSS class |
| TOOLBAR_GRID_AREA | gridArea | CSS grid area placement |
| TOOLBAR_FLAG_SUBMIT | toolbarFlagSubmit | 'Y' → true |
| TOOLBAR_ACTION_TARGET | actionTarget | Target for action |
| TOOLBAR_FLAG_ACTION | flagAction | 'Y' → true |
| TOOLBAR_FLAG_POPOVER | flagPopover | 'Y' → true |

**GtsToolbarItems + GtsButtons** (items → `toolbars[].itemsList[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| OBJECT_NAME | objectName | Item identifier |
| LOCATION | location | Position in toolbar |
| TYPE | type | "button", "title", "field", "dropDownButton" |
| BUTTON_ID | buttonId | Reference to GtsButtons |
| ITEM_ORDER_LOGIC | orderLogic | Sort order |
| OBJECT_TEXT | text | Text (overridden by BUTTON_TEXT) |
| BUTTON_FLAG_SUBMIT | submitBehavior | 'Y' → true |
| BUTTON_TYPE | buttonType | From GtsButtons |
| STYLING_MODE | stylingMode | From GtsButtons |
| BUTTON_TEXT | text | From GtsButtons (overrides OBJECT_TEXT) |
| ICON_ID | iconId | From GtsButtons |
| STDIMAGE_ID | stdImageId | From GtsButtons |
| WIDTH | width | From GtsButtons |
| ACTION_NAME | actionName | Action to run on click |
| CLDATASET_OBJ_NAME | dataSet | Dataset reference (note: `dataSet` not `dataSetName`) |
| PAGE_FIELD_NAME | pageFieldName | Associated page field |
| GROUP_TEXT | groupText | Group label for dropDownButton |
| GROUP_COLOR | groupColor | Group color for dropDownButton |

### 9.5 GtsViews + GtsViewsHdr → `views[]`

**GtsViewsHdr** (header):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| VIEW_NAME | viewName | View identifier |
| VIEW_LEVEL | viewLevel | View hierarchy level |
| VIEW_STYLE | viewStyle | CSS class for the view |
| VIEW_FLAG_ALWAYS_ACTIVE | viewFlagAlwaysActive | 'Y' → true (objects visible in ALL views) |

**GtsViews** (objects → `views[].objects[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| OBJECT_TYPE | objectType | "grid", "form", "toolbar", "tabs" |
| OBJECT_NAME | objectName | Component identifier |
| VIEW_OBJECT_RN | objectRN | Row number / order |
| TABS_NAME | tabsName | Parent tabs group |
| TAB_RN | tabRN | Which tab this belongs to |
| EXEC_COND_NOT_VISIBLE | execCondNotVisible | 'Y' → true |
| CLDATASET_OBJ_NAME | dataSetName | From joined GtsToolbarItems |
| PAGE_FIELD_NAME | pageFielName | From joined GtsToolbarItems |
| SELECTED | selected | Pre-selection value |
| SELECTED_OBJ_NAME | selectedObjectName | Selected object name |
| EXEC_COND_ARRAY | execCond | JSON string → parsed array `[{Id, Value}]` |

### 9.6 GtsActions → `actions[]`

Each unique ACTION_NAME becomes one action group with ordered steps.

**Action header**:
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| ACTION_NAME | objectName | Action identifier (e.g., "initPage") |

**Action steps** (`actions[].actions[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| ACTION_TYPE | actionType | See Section 3 for all 41+ types |
| ACTION_ORDER_LOGIC | actionOrder | Step execution order |
| CUSTOM_CODE | customCode | Custom code identifier for execCustom |
| VIEW_NAME | viewName | For setView action |
| DATA_ADAPTER | dataAdapter | For getData action |
| CLSQL_ID | sqlId | SQL reference for execProc etc. |
| FIELDGRP_ID | fieldGrpId | Field group ID |
| CLFLDGRP_ID | clFldGrpId | Form field group ID |
| PAGE_FIELD_NAME | pageFldName | Target pageField |
| PAGE_FIELD_VALUE | fieldValue | Value to set on pageField |
| CLDATASET_OBJ_NAME | dataSetName | Target dataset |
| CLMSG_ID | msgId | Message ID for showMsg/showOKCancel |
| **EXEC_ACTION** | **actionName** | **Action to run after this step (key for async continuation)** |
| COND_ID | condId | Condition rule ID for setRule |
| COND_VALUE | condValue | Condition value for setRule |
| CLDATASET_MASTER_OBJ_NAME | master | Master dataset name |
| TOOLBAR_OBJ_NAME | toolbarName | Target toolbar |
| CLGRID_OBJ_NAME | gridName | Target grid |
| TABS_NAME | tabsName | Target tabs group |
| EXEC_COND_ARRAY | execCond | JSON string → parsed `[{Id, Value}]` |
| TABS_RULES | tabsRules | JSON string → parsed `[{tabIndex, enabled, visible}]` from `[{idx, mode}]` where mode: 0=hidden, 1=visible+disabled, 2=visible+enabled |
| ACTION_ACTIVE | *(filter)* | Only rows with 'Y' are loaded |

### 9.7 GtsDataSets + GtsSQL → `dataSets[]`

| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLDATASET_DATAADAPTER_OBJ_NAME | dataAdapterName | Adapter identifier (e.g., "daCustomers") |
| CLDATASET_OBJ_NAME | dataSetName | Dataset identifier (e.g., "qCustomers") |
| CLSQL_ID | sqlId | SELECT SQL reference |
| CONN_CODE | connCode | Database connection code (from GtsSQL join) |
| CLDATASET_FLAG_LIMIT | limitInitialLoad | 'Y' → true |
| CLDATASET_LIMIT_VALUE | initialLoadLimit | Max rows on initial load |
| CLDATASET_MASTER_OBJ_NAME | master | Master dataset for master-detail |
| CLDATASET_IUD_TABLE | iudTable | Table name for INSERT/UPDATE/DELETE |
| CLDATASET_INS_SQL_ID | sqlInsertId | SQL for INSERT |
| CLDATASET_UPD_SQL_ID | sqlUpdateId | SQL for UPDATE |
| CLDATASET_DEL_SQL_ID | sqlDeleteId | SQL for DELETE |

### 9.8 GtsGrids + columns + bands → `grids[]`

**GtsGrids** (main grid config):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLGRID_OBJ_NAME | objectName | Grid identifier |
| CLSQL_ID | sqlId | SQL reference |
| CLDATASET_OBJ_NAME | dataSetName | From GtsDataSets join |
| CLDATASET_DATAADAPTER_OBJ_NAME | dataAdapter | From GtsDataSets join |
| GTSGRID_FOCUSED_ROW | focusedRowEnabled | !='N' → true |
| CLGRID_FLAG_FILTER_ROW | filterRowVisible | 'Y' → true |
| GTSGRID_FLAG_FILTERED | allowHeaderFiltering | 'Y' → true |
| GTSGRID_EXPORT_FLAG | exportFlag | !='N' → true |
| GTSGRID_EXPORT_FILE_NAME | exportFileName | Export file name |
| GTSGRID_EXPORT_FORMATS | exportFormats | Comma-separated → array (default: ['xlsx']) |
| GTSGRID_ALLOW_COL_RESIZE | allowColumnResizing | !='N' → true |
| GTSGRID_ALLOW_COL_REORDER | allowColumnReordering | !='N' → true |
| GTSGRID_ALLOW_DELETE | allowDeleting | 'Y' → true |
| GTSGRID_SEARCH_PANEL | searchPanelFlag | !='N' → true |
| GTSGRID_SHOW_PAGE_SEL | showPageSizeSelector | !='N' → true |
| GTSGRID_SHOW_CHECK_BOXES | showCheckBoxesMode | Value string |
| GTSGRID_SELECT_ALL_MODE | selectAllMode | Value string |
| GTSGRID_ACTION_ON_SELECT | actionOnSelectedRows | Action on row select |
| GTSGRID_ACTION_ON_DCLICK | actionOnDoubleClickedRow | Action on double-click |
| GTSGRID_ACTION_ON_POST | actionOnEditPost | Action after edit post |
| GTSGRID_ACTION_ON_ROLLBACK | actionOnEditRollback | Action after edit rollback |
| GTSGRID_CAPTION | caption | Grid title |
| GTSGRID_CSS_CLASS | cssClass | CSS class |
| GTSGRID_WIDTH | width | Grid width |
| GTSGRID_HEIGHT | height | Grid height |
| GTSGRID_GRID_AREA | gridArea | CSS grid area placement |
| CLFLDGRP_ID | groupId | Form group ID (for grid-form link) |
| CLGRID_FLAG_MULTI_SELECT | selectionMode | 'Y' → "multiple", else "single" |
| GTSGRID_PAGE_SIZE | pageSize | Rows per page (default: 10) |
| GTSGRID_PAGE_SIZES | pageSizes | Comma-separated → number array (default: [10,20,50]) |
| GTSGRID_DD_STATUS | DDStatus | Drag & Drop status field |
| GTSGRID_DD_TASKS_GROUP | DDTasksGroup | D&D tasks group |
| GTSGRID_DD_ACTION_TO | DDActionTo | D&D action on drop target |
| GTSGRID_DD_ACTION_FROM | DDActionFrom | D&D action on drag source |
| GTSGRID_SHOW_POPUP | showPopUp | 'Y' → true |

**GtsColumns + GtsSQLColumnsLink + GtsSQLAllColumns** (columns → `grids[].columns[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLCOL_ID | columnId | Column ID |
| CLCOL_FIELD_NAME | fieldName | Database field name |
| CLCOL_CAPTION | text | Column header text |
| CLCOL_WIDTH | width | Column width |
| CLCOL_CAPTION_ALIGN | captionAlign | Header alignment |
| COLLINK_FLAG_SUMMARY | summary | !='N' && not null → true |
| COLLINK_FLAG_SUMMARY | summaryType | Maps: A→Avg, S→Sum, C→Count, M→Min, X→Max |
| COLLINK_CHECKBOX_CHECKED | checkedValue | Checkbox checked value |
| COLLINK_CHECKBOX_UNCHECKED | uncheckedValue | Checkbox unchecked value |
| COLLINK_FLAG_EDITABLE | allowEditing | 'Y' → true |
| COLLINK_FLAG_VISIBLE | visible | !='N' → true |
| COLLINK_WEIGHT_FIELD | summaryWeightCol | Weight field for weighted avg |
| COLLINK_PRODUCT_FIELD | summaryProductCol | Product field for weighted avg |
| COLLINK_COLUMN_TYPE | columnType | Column data type |
| BAND_ID | bandId | Column band grouping |
| COLLINK_ORDER_LOGIC | colOrder | Display order |
| COLLINK_ORDER | colRn | Row number |
| COL_TYPE_DESCR | colType | DB column type (from GtsSQLAllColumns) |
| COLLINK_EDITOR_TYPE | editorType | Editor type for inline editing |
| COLLINK_FIELD_NAME | lookUpFieldName | Lookup field reference |
| COLLINK_SQL_ID | lookUpSqlId | Lookup SQL reference |
| EDITMASK_ID | maskId, mask | Number format mask (lookup from numberFormat array) |
| COLLINK_FLAG_GROUPBY | groupBy | 'Y' → true |

**GtsColumnsImg** (column images → `grids[].columns[].images[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| STDIMAGE_ID | stdImageId | Standard image identifier |
| COLLINKIMG_DESCR | imgText | Image tooltip text |
| COLLINKIMG_VALUE | imgValue | Cell value that triggers this image |

**GtsGridBands** (column bands → `grids[].bands[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| BAND_ID | bandId | Band identifier |
| BAND_TEXT | bandText | Band header text |
| BAND_CSS | bandCssClass | Band CSS class |

**GtsSQLPKColumns** (primary keys → `grids[].sqlKeys[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| COL_NAME | keyField | Primary key column name |

### 9.9 GtsPageFields + GtsPageFieldsGrp → `pageFields[]`

| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| PAGE_FIELD_NAME | pageFieldName | Field identifier (e.g., "gtsFldqCustomers_name") |
| FIELDGRP_ID | fieldGrpId | Field group ID |
| SQLFIELD_NAME | dbFieldName | Database column name |
| PAGE_FIELD_LABEL | pageFieldLabel | Display label |
| PAGE_FIELD_TYPE | fieldType | "Text", "Check", "Date", etc. |
| PAGE_FIELD_OPTIONS | fieldOptions | JSON string → parsed (for Check: `[{value,checked}]`) |
| CLDATASET_OBJ_NAME | dataSetName | Parent dataset |
| COL_TYPE_DESCR | dataType | DB column type (from GtsSQLAllColumns join) |
| FIELDGRP_DESCR | fieldGrpDescr | Group description (from GtsPageFieldsGrp) |
| CLDATASET_OBJ_NAME (grp) | fieldGrpDataSetName | Group's dataset (from GtsPageFieldsGrp) |
| FIELDGRP_GRID_AREA | fieldGrpGridArea | Group's CSS grid area (from GtsPageFieldsGrp) |

### 9.10 GtsExecCondRules → `condRules[]`

| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| COND_ID | condId | Rule identifier |
| COND_DESCR | condDescr | Rule description |
| COND_VALUE | condValue | Initial/default value |
| DATASET_NAME | dataSetName | Dataset to monitor |
| FIELD_NAME | fieldName | Field to evaluate |
| FIELD_VALUES | fieldValues | Comma-separated string → array |
| COND_DS_VALUES | dataSetCondValues | Comma-separated string → array |

### 9.11 GtsFldGroups + GtsFldWizards + GtsFields → `forms[]`

**GtsFldGroups + GtsFldWizards** (form groups → `forms[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLFLDGRP_ID | groupId | Form group ID |
| CLFLDGRP_TYPE | groupType | Group type |
| CLFLDGRP_OBJ_NAME | objectName | Form component name |
| CLFLDGRP_CAPTION | groupCaption | Form title |
| CLFLDGRP_DESCR | groupDescr | Form description |
| CLFLDGRP_FLAG_POPUP | groupShowPopUp | 'Y' → true |
| CLFLDGRP_ROWS | groupRows | CSS grid rows count |
| CLFLDGRP_COLUMNS | groupCols | CSS grid columns count |
| CLFLDGRP_HEIGHT | groupHeight | Form height |
| CLFLDGRP_WIDTH | groupWidth | Form width |
| CLFLDGRP_CSS_CLASS | cssClass | CSS class |
| CLFLDGRP_STYLE | cssStyle | CSS inline style (cr/lf replaced with space) |
| CLFLDGRP_GRID_AREA | gridArea | CSS grid area placement |
| CLFLDGRP_STYLING_MODE | stylingMode | PrimeNG styling mode |
| CLFLDGRP_LABEL_MODE | labelMode | Label display mode |
| WIZ_NAME | wizName | Wizard name (if wizard form) |
| CLFLDGRP_WIZ_ORDER | wizOrder | Wizard step order |
| WIZ_DESCR | wizData.wizDescr | From GtsFldWizards |
| WIZ_TABS_NUM | wizData.wizTabsNum | From GtsFldWizards |
| WIZ_CAPTION | wizData.wizCaption | From GtsFldWizards |
| WIZ_CSS_CLASS | wizData.wizCssClass | From GtsFldWizards |
| WIZ_OBJ_NAME | wizData.objectName | From GtsFldWizards |

**Note:** When `groupRows` and `groupCols` are set, the server auto-generates CSS `grid-template-areas` from field positions using the `generateGridTemplateAreas()` function, which reads `gridArea` (e.g., "R1C1", "R5C3;R5C4") from fields and details, and writes the result to `cssStyle`.

**GtsFields + GtsButtons** (form fields → `forms[].fields[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLFLD_ID | fieldId | Field ID |
| CLFLD_CODE | fieldCode | Field code |
| CLFLD_OBJ_NAME | objectName | Field component name |
| CLFLD_FIELD_NAME | fieldName | Database field name |
| CLFLD_OBJ_LABEL | fieldLabel | Display label |
| CLFLD_ORDER_LOGIC | fieldOrder | Display order |
| CLFLD_DEFAULT_VALUE | defaultValue | Default value (for DropDownBox: "default;opt1,opt2,opt3") |
| CLFLD_TYPE | dataType | Data type |
| CLFLD_GRID_AREA | gridArea | CSS grid area (e.g., "R1C1") |
| CLFLD_FLAG_PK | isPK | 'Y' → true |
| CLFLD_FLAG_ALLOW_EMPTY | allowEmpty | 'Y' → true |
| CLFLD_FLAG_UPPERCASE | upperCaseForced | 'Y' → true |
| CLFLD_FLAG_FORCE_CHECK | forceCheck | 'Y' → true |
| CLFLD_FLAG_INIT_AS_DISABLED | initAsDisabled | 'Y' → true |
| CLFLD_FLAG_INIT_AS_READONLY | initAsReadOnly | 'Y' → true |
| CLFLD_FLAG_DISABLED_ON_WIZBACK | disabledOnWizBack | 'Y' → true |
| CLFLD_EDITOR_TYPE | editorType | "TextBox", "DateBox", "DropDownBox", "NumberBox", "CheckBox", "TextArea" |
| CLFLD_EDITOR_ML | editorTypeML | 'Y' → true (multiline) |
| CLFLD_RANGE_LOW | fieldRangeLow | Minimum value |
| CLFLD_RANGE_HI | fieldRangeHigh | Maximum value |
| ACTION_NAME | actionName | Action on field event |
| CLSQL_ID | sqlId | Lookup SQL reference |
| BUTTON_ID | buttonId | Associated button |
| BUTTON_ACTION | buttonAction | Button action |
| ICON_ID | iconId | From GtsButtons join |
| STDIMAGE_ID | stdImageId | From GtsButtons join |
| BUTTON_TEXT | buttonText | From GtsButtons join |
| CLFLD_AREA_HEIGHT | areaHeight | TextArea height |
| CLFLD_VALUE_CHECKED | valueChecked | CheckBox checked value |
| CLFLD_VALUE_UNCHECKED | valueUnchecked | CheckBox unchecked value |
| EDITMASK_ID | fieldMask | Number format mask (lookup from numberFormat array) |

**DropDownBox special handling:** When `editorType === 'DropDownBox'`, `CLFLD_DEFAULT_VALUE` is split: `"defaultValue;option1,option2,option3"` → `defaultValue = "defaultValue"`, `dropDownList = ["option1","option2","option3"]`

**GtsFieldsDet** (field details / linked pageFields → `forms[].fields[].details[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLFLDDET_FIELD_NAME | detailFieldName | Database field name |
| CLFLDDET_OBJ_NAME | pageFieldName | Linked pageField name |
| PAGE_FIELD_LABEL | pageFieldLabel | Label |
| CLFLDADETFLAG_LOCK_FIELD | detailFieldLocked | 'Y' → true |
| CLFLDDET_FLAG_CHECK_EMPTY | detailFieldLoadOnlyIfEmpty | 'Y' → true |
| CLFLD_GRID_AREA | gridArea | CSS grid area |
| EDITMASK_ID | fieldMask | Number format mask |

### 9.12 GtsMessages → `messages[]`

Messages are extracted from GtsActions join (only messages referenced by actions):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLMSG_ID | msgId | Message ID |
| CLMSG_FLAG_TYPE | msgType | "I"=info, "E"=error, "W"=warning, "Q"=question, "M"=message |
| CLMSG_TEXT | msgText | Message body text |
| CLMSG_TITLE | msgTitle | Message dialog title |

### 9.13 Reports Tables → `reportsGroups[]` + GtsReports collection

**GtsRptPageGroupLink + GtsPageFieldsGrp + GtsRptReports + GtsRptGroups**:

Report groups (`reportsGroups[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| FIELDGRP_ID | fieldGrpId | Field group ID |
| FIELDGRP_DESCR | fieldGrpDescr | Group description |
| FIELDGRP_GRID_AREA | gridArea | CSS grid area |
| RPTGROUP_CODE | reportGroupCode | Report group code |
| RPTGROUP_DESCR | reportGroupDescr | Report group description |

Individual reports (`reportsGroups[].reports[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| RPTGROUP_PATH | reportGroupPath | Report file path |
| RPTGROUP_PATH_BY_CONN | reportPathByConn | 'Y' → true (path varies by connection) |
| RPTSERVICE_CODE | reportServiceName / rptServiceCode | Report service |
| RPTHDR_CODE | reportCode | Report header code |
| RPTHDR_REPORT_NAME | reportName | Report file name |
| RPTHDR_DESCR | reportDescr | Report description |
| CLSQL_ID | sqlId | SQL for report params |
| EXEC_COND_ARRAY | execCond | JSON string → parsed `[{Id, Value}]` |

Reports are also saved as separate `GtsReports` MongoDB collection entries (with prjId, formId, reportCode).

### 9.14 GtsSQL + related tables → `GtsSQL` collection + `sqls[]`

The `loadSQLData` step collects ALL SQL statements used by the form (from actions, fields, and reports) and creates entries in the `GtsSQL` MongoDB collection.

**GtsSQL** (main SQL definition):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLSQL_ID | sqlId | SQL identifier |
| CLSQL_FLAG_TYPE | sqlType | SQL type |
| CLSQL_FORM_CAPTION | sqlDescription | SQL description |
| CLSQL_SQL | sqlCode | SQL statement text |
| CONN_CODE | connCode | Database connection code |
| MDBOP_ID | mongoId | MongoDB operation ID (if MongoDB query) |
| CLSQL_FLAG_COLUMNS | flagColumns | 'Y' → true |

**GtsSQLPKColumns** (SQL primary keys → `sqlKeys[]`):
| SQLite Column | MongoDB Field |
|---|---|
| COL_NAME | keyField |

**GtsSQLVariables** (SQL parameters → `sqlParams[]`):
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| CLSQLVAR_VAR_NAME | paramName | Parameter name (e.g., ":P_CUSTOMER_ID") |
| CLSQLVAR_FLAG_TYPE | paramType | Parameter data type |
| CLSQLVAR_FLAG_IN_OUT | paramInOut | "I"=input, "O"=output, "IO"=both |
| CLSQLVAR_OBJ_NAME | paramObjectName | PageField to read/write value |
| CLSQLVAR_DATASET_NAME | paramDataSetName | Dataset source |
| CLSQLVAR_DATASET_FIELD | paramDataSetField | Dataset field source |
| CLSQLVAR_FLAG_MASTERKEY | masterKey | 'Y' → true |

**GtsSQLAllColumns** (SQL result columns → `sqlFields[]`):
| SQLite Column | MongoDB Field |
|---|---|
| COL_NAME | colName |
| COL_TYPE_DESCR | colType |
| COL_ORDER | colOrder |
| COL_LENGTH | colLength |
| COL_PRECISION | colPrecision |
| COL_SCALE | colScale |

**GtsMDBOperations** (MongoDB operation definition → `mongoOp`):
| SQLite Column | MongoDB Field |
|---|---|
| CONN_CODE | mongoOp.CONN_CODE |
| DATASCHEMA_NAME | mongoOp.DATASCHEMA_NAME |
| COLL_NAME | mongoOp.COLL_NAME |
| METHOD_NAME | mongoOp.METHOD_NAME |
| MDBOP_PARAMS | mongoOp.MDBOP_PARAMS |
| MDBOP_QUERY | mongoOp.MDBOP_QUERY |
| MDBOP_QUERY_LEVEL | mongoOp.MDBOP_QUERY_LEVEL |
| MDBOP_ARRAY_FIELD_NAME | mongoOp.MDBOP_ARRAY_FIELD_NAME |
| MDBOP_FIND_DISTINCT | mongoOp.distinct ('Y' → true) |

**GtsMDBOperFields** (MongoDB operation fields → `mongoOp.doc[]`, `mongoOp.sort[]`, `mongoOp.projection[]`, `mongoOp.queryParams[]`):

Differentiated by `MDBOPFLD_TYPE`:
- **'D'** (Document) → `mongoOp.doc[]`: `{COLL_FIELD_NAME, PAGE_FIELD_NAME, MDBOPFLD_VALUE}`
- **'S'** (Sort) → `mongoOp.sort[]`: `{COLL_FIELD_NAME, MDBOPFLD_SORT_DIR}`
- **'P'** (Projection) → `mongoOp.projection[]`: `{COLL_FIELD_NAME, value: parseInt(MDBOPFLD_VALUE)}`
- **'Q'** (Query param) → `mongoOp.queryParams[]`: `{MDBPOPFLD_QUERY_PARAM, MDBPOPFLD_QUERY_PARAM_TYPE, PAGE_FIELD_NAME, MDBOPFLD_VALUE}`

The `sqls[]` array stored on the GtsPages document is a simplified version:
```
sqls[n] = {
    sqlId, mongoId, sqlCaption, sqlKeys[],
    sqlType: mongoId ? 'MongoDB' : 'SQL',
    sqlParams[] (only for SQL type),
    queryParams[] (only for MongoDB type),
    doc[], columns[], opFieldName
}
```

### 9.15 completeActions (Post-Processing)

After all data is loaded, `completeActions` enriches the stored data:

1. **Actions enrichment**: For each action step:
   - `getData` → finds matching dataset → gets sqlParams, sqlType, queryParams, doc from sqls[]
   - Steps with `sqlId` → gets sqlParams, sqlType, queryParams, doc from sqls[]
   - `dsInsert`/`dsEdit`/`dsDelete` → finds matching dataset → gets appropriate SQL (insert/update/delete) params
   - Steps with `msgId` → attaches full message object from messages[]

2. **Forms enrichment**: For each form field with `sqlId`:
   - Attaches columns, sqlParams, sqlType, sqlCaption, sqlKeys, doc from sqls[]
   - For MongoDB type: converts queryParams to sqlParams format

### 9.16 GtsMenuTree + GtsMenuItems → `GtsMenu` collection (Setup)

Uploaded separately via `loadSetupData`:
| SQLite Column | MongoDB Field | Notes |
|---|---|---|
| MNUTREE_ID | treeId | Tree node ID |
| MNUITEM_ID | itemId | Menu item ID |
| MNUTREE_LEAVE_ID | leafId | Leaf node ID |
| MNUTREE_PARENT_ID | parentId | Parent node ID |
| FORM_ID | formId | Target form/page |
| MNUTREE_DESCR | caption | Menu item text |
| ICON_ID | iconId | Icon (from tree or item) |
| MNUITEM_RUN_PARAMS | menuParam | Run parameters |
| MNUTREE_CONN_LIST | connections | "CONN1;CONN2" → ["CONN1","CONN2"] |
| *(preserved)* | roles | Preserved from previous MongoDB data |

### 9.17 Number Format Masks

The `numberFormat` array maps `EDITMASK_ID` to display masks:
| ID | Mask | ID | Mask |
|---|---|---|---|
| 1 | `0` | 10 | `#0.0` |
| 2 | `00` | 11 | `#0.00` |
| 3 | `000` | 12 | `#,##0` |
| 4 | `#` | 13 | `#0.000` |
| 5 | `#0` | 14 | `#0.0000` |
| 6 | `#.0` | 15 | `#0.00000` |
| 7 | `#.00` | 16 | `#0.000000` |
| 8 | `#0.000000` | 17 | `#0.0000000` |
| 9 | `#,###.00` | 18 | `#0.00000000` |

---

## 10. Key Conventions

1. **Naming**: `da` prefix = dataAdapter, `q` prefix = dataSetName/query, `gtsFld` prefix = pageField
2. **pageFieldName format**: `gtsFld` + dataSetName + `_` + dbFieldName (e.g., `gtsFldqCustomers_name`)
3. **tabIndex**: 1-based in metadata, subtract 1 for array access
4. **enabled/disabled**: metadata `enabled` maps to component `disabled` (inverted)
5. **toolbar.dataSet**: property name is `dataSet` (not `dataSetName`)
6. **Check fields**: `fieldOptions` maps string values to boolean: `[{value:"Y", checked:true}, {value:"N", checked:false}]`
7. **customMsg**: Set via `setCustomMsg()` before calling action with `showMsg` that reads it
8. **execCustom + actionName**: For async operations, split into two actions. The `execCustom` does the work and specifies `actionName` for the follow-up action.
