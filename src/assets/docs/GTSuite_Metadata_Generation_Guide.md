# GTSuite Metadata Generation Guide

Guida completa per la generazione di metadati GTSuite per applicazioni Angular/Ionic.

## Indice

1. [Architettura del Sistema](#architettura-del-sistema)
2. [Trasformazione SQLite → MongoDB](#trasformazione-sqlite--mongodb)
3. [Schema MongoDB Reale (Angular)](#schema-mongodb-reale-angular)
4. [Tabelle SQLite](#tabelle-sqlite)
5. [Tipi di Azione (runAction)](#tipi-di-azione-runaction)
6. [Componenti UI](#componenti-ui)
7. [Tipi di Editor per Campi](#tipi-di-editor-per-campi)
8. [Pattern per Pagine Comuni](#pattern-per-pagine-comuni)
9. [Pattern Avanzati](#pattern-avanzati-da-form-10---roles-granted-objects)
10. [Esempi di Metadati](#esempi-di-metadati)

---

## Architettura del Sistema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SQLite DB      │────▶│  Node.js Server │────▶│  MongoDB        │
│  (Designer)     │     │  (API REST)     │     │  (Runtime)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  Angular/Ionic  │
                        │  (Client)       │
                        └─────────────────┘
```

### Flusso Dati

1. **SQLite** (`C:\GTSuite\Data\GTS_xxx.db`): Contiene i metadati creati dal Designer
2. **Server** (`/loadPage2`): Importa da SQLite a MongoDB
3. **MongoDB**: Memorizza i metadati in formato documento
4. **Angular Client**: Interpreta i metadati e genera l'UI dinamicamente

---

## Trasformazione SQLite → MongoDB

### Naming Convention

| SQLite (UPPER_CASE) | MongoDB (camelCase) |
|---------------------|---------------------|
| `ACTION_NAME` | `objectName` |
| `ACTION_TYPE` | `actionType` |
| `ACTION_ORDER_LOGIC` | `actionOrder` |
| `CLDATASET_OBJ_NAME` | `dataSetName` |
| `DATA_ADAPTER` | `dataAdapter` |
| `VIEW_NAME` | `viewName` |
| `EXEC_COND_ARRAY` | `execCond` (array già parsato) |
| `CUSTOM_CODE` | `customCode` |
| `CLSQL_ID` | `sqlId` |
| `CLMSG_ID` | `msgId` |
| `COND_ID` | `condId` |
| `COND_VALUE` | `condValue` |
| `OBJECT_TYPE` | `objectType` |
| `OBJECT_NAME` | `objectName` |
| `SELECTED_OBJ_NAME` | `selectedObjectName` |
| `PAGE_FIELD_NAME` | `pageFieldName` |

### Raggruppamento Actions

In SQLite ogni step è una **riga separata**. In MongoDB vengono **raggruppati per objectName**:

```javascript
// SQLite: righe separate
{ ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 1, ACTION_TYPE: "setRule", ... }
{ ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 3, ACTION_TYPE: "getData", ... }
{ ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 5, ACTION_TYPE: "setView", ... }

// MongoDB: raggruppate in un oggetto
{
  "objectName": "mainInit",
  "actions": [
    { "actionType": "setRule", "actionOrder": 1, "condId": 11, "condValue": 1 },
    { "actionType": "getData", "actionOrder": 3, "dataAdapter": "daProjects" },
    { "actionType": "setView", "actionOrder": 5, "viewName": "mainView" }
  ]
}
```

### actionOrder con Decimali (Sub-steps)

Quando un'action chiama altre actions tramite `callAction`, gli step vengono **appiattiti** con ordine decimale:

```javascript
// menuDS step 5 chiama "showMenu" che ha 5 sub-step
{ "actionOrder": 5.001, "actionType": "execCustom", "customCode": "setCtxProject2" },
{ "actionOrder": 5.002, "actionType": "setRule", "condId": 13, "condValue": 1 },
{ "actionOrder": 5.003, "actionType": "unselectDS", "dataSetName": "qObjects" },
{ "actionOrder": 5.004, "actionType": "setRule", "condId": 12, "condValue": 1 },
{ "actionOrder": 5.005, "actionType": "setView", "viewName": "showMenu" }
```

### execProc con Parametri Inline

Le stored procedure includono i parametri SQL direttamente:

```javascript
{
  "actionType": "execProc",
  "actionOrder": 2,
  "sqlId": 118,
  "sqlType": "MongoDB",
  "queryParams": [
    {
      "MDBPOPFLD_QUERY_PARAM": "P_PRJ_ID",
      "MDBPOPFLD_QUERY_PARAM_TYPE": "S",
      "PAGE_FIELD_NAME": "gtsFldqProjects_prjId"
    },
    {
      "MDBPOPFLD_QUERY_PARAM": "P_TREE_ID",
      "MDBPOPFLD_QUERY_PARAM_TYPE": "N",
      "PAGE_FIELD_NAME": "gtsFldqMenu_treeId"
    }
  ],
  "doc": [
    {
      "COLL_FIELD_NAME": "roles",
      "PAGE_FIELD_NAME": "gtsFldqMenu_roles"
    }
  ]
}
```

---

## Schema MongoDB Reale (Angular)

Questo è lo schema effettivo che Angular riceve da MongoDB (basato su Form 10):

### Root Document

```javascript
{
  "_id": "ObjectId",
  "prjId": "GTSW",
  "formId": 10,
  "page": {
    "prjId": "GTSW",
    "formId": 10,
    "initAction": "mainInit",
    "formUrl": "/gtsgrantedobjs"
  },
  "formUrl": "/gtsgrantedobjs",
  "formName": "GrantedObjsComponent",
  "pageTitle": "Role's Granted Objects",
  "initAction": "mainInit",
  "tabs": [...],
  "toolbars": [...],
  "views": [...],
  "actions": [...],
  "dataSets": [...],
  "grids": [...],
  "forms": [...],
  "pageFields": [...],
  "condRules": [...],
  "messages": [...],
  "sqls": [...]
}
```

### tabs Array

```javascript
{
  "objectName": "mainTabs",
  "gridArea": "R1C1",
  "tabsData": [
    {
      "tabId": 1,
      "iconId": 690,
      "visible": true,
      "disabled": false,
      "actionName": "showMenu",
      "text": "Menu"
    },
    {
      "tabId": 2,
      "iconId": 358,
      "visible": true,
      "disabled": false,
      "actionName": "showObj",
      "text": "Objects Various"
    }
  ]
}
```

### toolbars Array

```javascript
{
  "objectName": "mainToolbar",
  "objectDescr": "Main Toolbar",
  "toolbarId": 1,
  "cssClass": null,
  "gridArea": "R0C1",
  "toolbarFlagSubmit": false,
  "actionTarget": null,
  "flagAction": false,
  "flagPopover": false,
  "itemsList": [
    {
      "objectName": "mainTitle",
      "location": "center",
      "type": "title",
      "buttonId": null,
      "orderLogic": 1,
      "submitBehavior": false,
      "text": "Role's Granted Objects"
    },
    {
      "objectName": "selectedPrj",
      "location": "before",
      "type": "dropDownButton",
      "buttonId": null,
      "orderLogic": 2,
      "submitBehavior": false,
      "actionName": "",
      "dataSet": "qProjects",
      "pageFieldName": "gtsFldqProjects_prjId"
    },
    {
      "objectName": "menuAddRole",
      "location": "before",
      "type": "button",
      "buttonId": 5,
      "orderLogic": 4,
      "submitBehavior": false,
      "text": "Add Role",
      "buttonType": "normal",
      "stylingMode": "contained",
      "stdImageId": 1705,
      "actionName": "menuAddRole"
    }
  ]
}
```

### views Array

```javascript
{
  "viewName": "showMenu",
  "viewLevel": 1,
  "viewStyle": "grid-template-columns: 1fr 1fr 1fr; display: grid; grid-template-areas: \"R1C1 R1C1 R1C1\" \"R2C1 R2C2 R2C3\" ...",
  "viewFlagAlwaysActive": false,
  "objects": [
    {
      "objectType": "toolbarItem",
      "objectName": "selectedPrj",
      "objectRN": 5,
      "tabsName": null,
      "tabRN": null,
      "execCondNotVisible": true,
      "dataSetName": "qProjects",
      "pageFielName": "gtsFldqProjects_prjId",
      "selected": "U",
      "selectedObjectName": ""
    },
    {
      "objectType": "grid",
      "objectName": "gtsGridAllRoles",
      "objectRN": 7,
      "selected": "Y",
      "selectedObjectName": "qMenu"
    }
  ]
}
```

### actions Array

```javascript
{
  "objectName": "mainInit",
  "prjId": "GTSW",
  "formId": 10,
  "actions": [
    {
      "actionType": "setRule",
      "actionOrder": 1,
      "condId": 11,
      "condValue": 1,
      "master": null
    },
    {
      "actionType": "getData",
      "actionOrder": 3,
      "dataAdapter": "daProjects",
      "master": null,
      "sqlParams": [],
      "sqlType": "MongoDB",
      "queryParams": [],
      "doc": []
    },
    {
      "actionType": "setView",
      "actionOrder": 5,
      "viewName": "mainView",
      "master": null
    }
  ]
}
```

### grids Array

```javascript
{
  "objectName": "gtsGridAllRoles",
  "sqlId": 4,
  "gridCaption": "ALL ROLES",
  "gridCssClass": "grid007",
  "gridArea": "R5C2",
  "flagAutoWidth": false,
  "flagFilterRow": true,
  "flagMultiSelect": false,
  "focusedRow": true,
  "exportFlag": true,
  "exportFormats": "xlsx",
  "allowColResize": true,
  "allowColReorder": true,
  "searchPanel": true,
  "pageSizes": "10,20,50,100,all",
  "pageSize": 10,
  "showPageSelector": true,
  "showCheckBoxes": "always",
  "selectAllMode": "allPages",
  "flagFiltered": true,
  "actionOnSelect": "allRolesSelect",
  "actionOnClick": null,
  "actionOnDblClick": "addRole",
  "dragDrop": {
    "ddStatus": 1,
    "ddTasksGroup": "DDRoles",
    "ddActionTo": null,
    "ddActionFrom": null
  },
  "columns": [
    {
      "columnName": "roleId",
      "columnCaption": "Role ID",
      "columnType": "number",
      "visible": true,
      "width": 80
    },
    {
      "columnName": "roleName",
      "columnCaption": "Role Name",
      "columnType": "string",
      "visible": true,
      "width": 200
    }
  ]
}
```

### dataSets Array

```javascript
{
  "objectName": "qProjects",
  "sqlId": 27,
  "dataAdapterName": "daProjects",
  "masterDataSet": null,
  "insSqlId": null,
  "updSqlId": null,
  "delSqlId": null,
  "iudTable": null
}
```

### condRules Array

```javascript
{
  "condId": 11,
  "condDescr": "Show Form PopUp => 1=Idle; 2=Show",
  "condValue": 1,
  "dataSetName": null,
  "fieldName": null,
  "fieldValues": null,
  "condDsValues": null
}
```

### messages Array

```javascript
{
  "msgId": 1,
  "msgType": "Q",
  "msgText": "Are you sure you want to delete this record?",
  "msgTitle": "Confirm Delete",
  "okAction": "objectDELExec",
  "cancelAction": null
}
```

### forms Array

```javascript
{
  "objectName": "objectDataForm",
  "formId": 1,
  "formCaption": "Object Data",
  "gridArea": "R4C1",
  "colCount": 2,
  "dataSet": "qObjects",
  "groups": [
    {
      "groupId": 1,
      "groupCaption": "Object Information",
      "colCount": 2,
      "fields": [
        {
          "fieldName": "objectName",
          "fieldCaption": "Object Name",
          "editorType": "dxTextBox",
          "required": true,
          "colSpan": 1
        }
      ]
    }
  ]
}
```

---

## Struttura MongoDB (GtsPages)

Schema principale per una pagina:

```javascript
{
  prjId: String,           // Codice progetto (es: "GTSW")
  formId: Number,          // ID univoco della pagina
  page: Object,            // Configurazione pagina base
  formUrl: String,         // URL della pagina
  formName: String,        // Nome della form
  pageTitle: String,       // Titolo visualizzato
  initAction: String,      // Azione iniziale da eseguire
  tabs: Array,             // Definizioni tab
  toolbars: Array,         // Barre degli strumenti
  views: Array,            // Layout delle viste
  actions: Array,          // Definizioni azioni
  dataSets: Array,         // Dataset/DataAdapter
  forms: Array,            // Form di input
  grids: Array,            // Griglie dati
  pageFields: Array,       // Campi pagina
  condRules: Array,        // Regole condizionali
  messages: Array,         // Messaggi
  reportsGroups: Array,    // Gruppi report
  sqls: Array              // Query SQL
}
```

---

## Tabelle SQLite

### Tabella Principale: GtsForms

```sql
CREATE TABLE GtsForms (
  FormId INTEGER PRIMARY KEY,
  FormUrl TEXT,              -- URL della pagina (es: "users")
  FormName TEXT,             -- Nome form
  PageTitle TEXT,            -- Titolo pagina
  InitAction TEXT,           -- Azione iniziale (es: "actInit")
  FormClass TEXT,            -- Classe CSS
  FormType INTEGER,          -- Tipo form (1=standard, 2=popup, etc.)
  MenuId INTEGER,            -- ID menu associato
  IconName TEXT,             -- Icona
  FormOrder INTEGER          -- Ordine nel menu
);
```

### GtsTabs - Definizione Tab

```sql
CREATE TABLE GtsTabs (
  TabId INTEGER PRIMARY KEY,
  FormId INTEGER,
  TabName TEXT,              -- Nome identificativo
  TabText TEXT,              -- Testo visualizzato
  TabIcon TEXT,              -- Icona tab
  TabOrder INTEGER,          -- Ordine visualizzazione
  TabVisible INTEGER,        -- 1=visibile, 0=nascosto
  TabEnabled INTEGER         -- 1=abilitato, 0=disabilitato
);
```

### GtsViews - Layout Viste

```sql
CREATE TABLE GtsViews (
  ViewId INTEGER PRIMARY KEY,
  FormId INTEGER,
  ViewName TEXT,             -- Nome vista (es: "vwList", "vwEdit")
  ViewType INTEGER,          -- Tipo (1=grid, 2=form, 3=mixed)
  TabId INTEGER,             -- Tab contenitore
  ViewOrder INTEGER,
  ViewVisible INTEGER,
  ViewClass TEXT             -- Classe CSS
);

CREATE TABLE GtsViewsHdr (
  ViewHdrId INTEGER PRIMARY KEY,
  ViewId INTEGER,
  ComponentType TEXT,        -- "grid", "form", "toolbar"
  ComponentName TEXT,        -- Nome componente
  ComponentOrder INTEGER
);
```

### GtsToolbar - Barre Strumenti

```sql
CREATE TABLE GtsToolbar (
  ToolbarId INTEGER PRIMARY KEY,
  FormId INTEGER,
  ToolbarName TEXT,          -- Nome toolbar (es: "tbMain")
  ToolbarType INTEGER,       -- Tipo (1=standard, 2=contextual)
  ToolbarVisible INTEGER
);

CREATE TABLE GtsToolbarItems (
  ItemId INTEGER PRIMARY KEY,
  ToolbarId INTEGER,
  ItemType TEXT,             -- "button", "separator", "menu"
  ItemName TEXT,
  ItemText TEXT,
  ItemIcon TEXT,
  ItemAction TEXT,           -- Azione da eseguire
  ItemOrder INTEGER,
  ItemVisible INTEGER,
  ItemEnabled INTEGER
);

CREATE TABLE GtsButtons (
  ButtonId INTEGER PRIMARY KEY,
  FormId INTEGER,
  ButtonName TEXT,
  ButtonText TEXT,
  ButtonIcon TEXT,
  ButtonAction TEXT,
  ButtonType TEXT,           -- "normal", "success", "danger"
  ButtonLocation TEXT,       -- "toolbar", "form", "popup"
  ButtonOrder INTEGER
);
```

### GtsActions - Definizioni Azioni

```sql
CREATE TABLE GtsActions (
  ActionId INTEGER PRIMARY KEY,
  FormId INTEGER,
  ActionName TEXT,           -- Nome azione (es: "actInit", "actSave")
  ActionType TEXT,           -- Tipo azione (vedi sezione Tipi di Azione)
  ActionParams TEXT,         -- Parametri JSON
  NextAction TEXT,           -- Azione successiva (catena)
  CondRule TEXT,             -- Regola condizionale
  ActionOrder INTEGER,
  ActionEnabled INTEGER
);
```

**Struttura ActionParams (JSON):**

```javascript
{
  "dsName": "dsUsers",           // Nome dataset
  "viewName": "vwEdit",          // Nome vista
  "msgName": "msgConfirm",       // Nome messaggio
  "procName": "sp_SaveUser",     // Nome stored procedure
  "formName": "frmEdit",         // Nome form
  "gridName": "grdUsers",        // Nome griglia
  "fieldName": "status",         // Nome campo
  "fieldValue": "A",             // Valore campo
  "ruleName": "ruleCheck",       // Nome regola
  "customCode": "..."            // Codice custom
}
```

### GtsDataSets - Dataset/DataAdapter

```sql
CREATE TABLE GtsDataSets (
  DataSetId INTEGER PRIMARY KEY,
  FormId INTEGER,
  DSName TEXT,               -- Nome dataset (es: "dsUsers")
  DSType INTEGER,            -- Tipo (1=query, 2=storedproc)
  SQLName TEXT,              -- Riferimento a GtsSQL
  DSAutoLoad INTEGER,        -- Caricamento automatico
  DSPageSize INTEGER,        -- Righe per pagina
  DSKeyField TEXT,           -- Campo chiave primaria
  DSMasterDS TEXT,           -- Dataset master (per detail)
  DSMasterKey TEXT,          -- Chiave master
  DSDetailKey TEXT           -- Chiave detail
);
```

### GtsSQL - Query SQL

```sql
CREATE TABLE GtsSQL (
  SQLId INTEGER PRIMARY KEY,
  FormId INTEGER,
  SQLName TEXT,              -- Nome query (es: "sqlUsers")
  SQLText TEXT,              -- Testo SQL
  SQLType INTEGER,           -- 1=SELECT, 2=INSERT, 3=UPDATE, 4=DELETE
  DBConnection TEXT          -- Connessione database
);

CREATE TABLE GtsSQLAllColumns (
  ColumnId INTEGER PRIMARY KEY,
  SQLId INTEGER,
  ColumnName TEXT,
  ColumnType TEXT,           -- "string", "number", "date", "boolean"
  ColumnSize INTEGER,
  ColumnPrecision INTEGER,
  ColumnNullable INTEGER,
  ColumnDefault TEXT
);

CREATE TABLE GtsSQLPKColumns (
  PKColumnId INTEGER PRIMARY KEY,
  SQLId INTEGER,
  ColumnName TEXT,
  PKOrder INTEGER
);

CREATE TABLE GtsSQLVariables (
  VarId INTEGER PRIMARY KEY,
  SQLId INTEGER,
  VarName TEXT,              -- Nome variabile (es: ":userId")
  VarType TEXT,              -- Tipo variabile
  VarDefault TEXT            -- Valore default
);
```

### GtsGrids - Configurazione Griglie

```sql
CREATE TABLE GtsGrids (
  GridId INTEGER PRIMARY KEY,
  FormId INTEGER,
  GridName TEXT,             -- Nome griglia (es: "grdUsers")
  DSName TEXT,               -- Dataset collegato
  GridType INTEGER,          -- Tipo griglia
  AllowEdit INTEGER,         -- Permetti modifica inline
  AllowInsert INTEGER,       -- Permetti inserimento
  AllowDelete INTEGER,       -- Permetti eliminazione
  AllowFilter INTEGER,       -- Mostra filtri
  AllowSort INTEGER,         -- Permetti ordinamento
  AllowExport INTEGER,       -- Permetti export
  SelectionMode TEXT,        -- "single", "multiple", "none"
  RowClick TEXT,             -- Azione su click riga
  RowDblClick TEXT           -- Azione su doppio click
);

CREATE TABLE GtsColumns (
  ColumnId INTEGER PRIMARY KEY,
  GridId INTEGER,
  ColumnName TEXT,           -- Nome colonna (campo)
  ColumnCaption TEXT,        -- Intestazione
  ColumnType TEXT,           -- Tipo dati
  ColumnWidth INTEGER,       -- Larghezza
  ColumnOrder INTEGER,       -- Ordine
  ColumnVisible INTEGER,     -- Visibile
  ColumnEditable INTEGER,    -- Modificabile
  EditorType TEXT,           -- Tipo editor (vedi sezione)
  EditorOptions TEXT,        -- Opzioni editor JSON
  Format TEXT,               -- Formato visualizzazione
  Alignment TEXT             -- "left", "center", "right"
);

CREATE TABLE GtsGridBands (
  BandId INTEGER PRIMARY KEY,
  GridId INTEGER,
  BandName TEXT,
  BandCaption TEXT,
  BandOrder INTEGER
);
```

### GtsForms (Dettaglio) - Form di Input

```sql
CREATE TABLE GtsFldGroups (
  GroupId INTEGER PRIMARY KEY,
  FormId INTEGER,
  FormName TEXT,             -- Nome form (es: "frmEdit")
  GroupName TEXT,            -- Nome gruppo campi
  GroupCaption TEXT,         -- Titolo gruppo
  GroupOrder INTEGER,
  GroupColCount INTEGER,     -- Numero colonne
  GroupVisible INTEGER
);

CREATE TABLE GtsFields (
  FieldId INTEGER PRIMARY KEY,
  GroupId INTEGER,
  FieldName TEXT,            -- Nome campo
  FieldCaption TEXT,         -- Etichetta
  FieldType TEXT,            -- Tipo dati
  EditorType TEXT,           -- Tipo editor
  EditorOptions TEXT,        -- Opzioni JSON
  FieldOrder INTEGER,
  FieldVisible INTEGER,
  FieldRequired INTEGER,
  FieldReadOnly INTEGER,
  ColSpan INTEGER,           -- Span colonne
  HelpText TEXT              -- Testo aiuto
);

CREATE TABLE GtsFieldsDet (
  FieldDetId INTEGER PRIMARY KEY,
  FieldId INTEGER,
  ValidationRule TEXT,       -- Regola validazione
  ValidationMsg TEXT,        -- Messaggio errore
  DefaultValue TEXT,         -- Valore default
  LookupDS TEXT,             -- Dataset lookup
  LookupKeyField TEXT,       -- Campo chiave lookup
  LookupDisplayField TEXT    -- Campo visualizzato lookup
);
```

### GtsPageFields - Campi Pagina

```sql
CREATE TABLE GtsPageFields (
  PageFieldId INTEGER PRIMARY KEY,
  FormId INTEGER,
  FieldName TEXT,            -- Nome campo
  FieldType TEXT,            -- Tipo
  FieldDefault TEXT,         -- Valore default
  FieldScope TEXT            -- "page", "session", "global"
);

CREATE TABLE GtsPageFieldsGrp (
  GrpId INTEGER PRIMARY KEY,
  FormId INTEGER,
  GrpName TEXT,
  GrpFields TEXT             -- Lista campi JSON
);
```

### GtsExecCondRules - Regole Condizionali

```sql
CREATE TABLE GtsExecCondRules (
  RuleId INTEGER PRIMARY KEY,
  FormId INTEGER,
  RuleName TEXT,             -- Nome regola
  RuleType TEXT,             -- "visible", "enabled", "required"
  RuleExpression TEXT,       -- Espressione condizionale
  RuleTarget TEXT,           -- Target (campo, pulsante, etc.)
  RuleAction TEXT            -- Azione se true
);
```

### GtsMessages - Messaggi

```sql
CREATE TABLE GtsMessages (
  MessageId INTEGER PRIMARY KEY,
  FormId INTEGER,
  MsgName TEXT,              -- Nome messaggio
  MsgType TEXT,              -- "info", "warning", "error", "confirm"
  MsgTitle TEXT,             -- Titolo
  MsgText TEXT,              -- Testo messaggio
  MsgButtons TEXT,           -- Pulsanti JSON
  MsgIcon TEXT,              -- Icona
  MsgYesAction TEXT,         -- Azione su Yes/OK
  MsgNoAction TEXT           -- Azione su No/Cancel
);
```

### GtsReports - Report

```sql
CREATE TABLE GtsRptGroups (
  GroupId INTEGER PRIMARY KEY,
  FormId INTEGER,
  GroupName TEXT,
  GroupCaption TEXT,
  GroupOrder INTEGER
);

CREATE TABLE GtsRptReports (
  ReportId INTEGER PRIMARY KEY,
  GroupId INTEGER,
  ReportName TEXT,
  ReportCaption TEXT,
  ReportType TEXT,           -- "pdf", "excel", "html"
  ReportTemplate TEXT,       -- Template report
  ReportParams TEXT,         -- Parametri JSON
  ReportOrder INTEGER
);

CREATE TABLE GtsRptPageGroupLink (
  LinkId INTEGER PRIMARY KEY,
  FormId INTEGER,
  GroupId INTEGER
);
```

---

## Tipi di Azione (runAction)

### Azioni di Navigazione/Vista

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `setView` | Cambia vista corrente | `viewName` |
| `setPreviousView` | Torna alla vista precedente | - |
| `setTab` | Cambia tab corrente | `tabName` |

### Azioni Dataset

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `getData` | Carica dati nel dataset | `dsName`, `params` |
| `removeData` | Rimuove dati dal dataset | `dsName` |
| `selectDS` | Seleziona riga nel dataset | `dsName`, `rowIndex` |
| `unselectDS` | Deseleziona riga | `dsName` |
| `goToFirstRow` | Va alla prima riga | `dsName` |
| `goToLastRow` | Va all'ultima riga | `dsName` |
| `dsInsert` | Inserisce nuova riga | `dsName` |
| `dsEdit` | Entra in modalità edit | `dsName` |
| `dsPost` | Salva modifiche | `dsName` |
| `dsCancel` | Annulla modifiche | `dsName` |
| `dsDelete` | Elimina riga | `dsName` |
| `dsRefresh` | Ricarica dataset | `dsName` |
| `dsRefreshSel` | Ricarica riga selezionata | `dsName` |

### Azioni Form

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `getFormData` | Popola form da dataset | `formName`, `dsName` |
| `saveFormData` | Salva form nel dataset | `formName`, `dsName` |
| `clearFields` | Pulisce campi form | `formName` |
| `setFieldValue` | Imposta valore campo | `fieldName`, `value` |
| `setFieldVisible` | Mostra/nasconde campo | `fieldName`, `visible` |
| `setFieldEnabled` | Abilita/disabilita campo | `fieldName`, `enabled` |
| `setFieldRequired` | Campo obbligatorio | `fieldName`, `required` |

### Azioni Griglia

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `gridSetIdle` | Griglia in stato idle | `gridName` |
| `gridSetEdit` | Griglia in modalità edit | `gridName` |
| `gridSetInsert` | Griglia in modalità insert | `gridName` |
| `gridAllowDelete` | Abilita eliminazione | `gridName`, `allow` |
| `gridPostChanges` | Salva modifiche griglia | `gridName` |
| `gridRollback` | Annulla modifiche griglia | `gridName` |

### Azioni Messaggi

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `showMsg` | Mostra messaggio | `msgName` |
| `showOKCancel` | Mostra conferma OK/Cancel | `msgName`, `yesAction`, `noAction` |
| `showYesNo` | Mostra conferma Yes/No | `msgName`, `yesAction`, `noAction` |

### Azioni Server

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `execProc` | Esegue stored procedure | `procName`, `params` |
| `execCustom` | Esegue codice custom | `customCode` |
| `getExportedData` | Esporta dati | `dsName`, `format` |

### Azioni Lock

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `pkLock` | Blocca record | `dsName`, `pkValue` |
| `pkUnlock` | Sblocca record | `dsName`, `pkValue` |

### Azioni Regole

| Tipo | Descrizione | Parametri |
|------|-------------|-----------|
| `setRule` | Applica regola condizionale | `ruleName` |
| `evalCondition` | Valuta condizione | `expression` |

---

## Componenti UI

### Componenti Angular Disponibili

| Componente | Descrizione | Selector |
|------------|-------------|----------|
| `GtsToolbar` | Barra strumenti | `<gts-toolbar>` |
| `GtsGrid` | Griglia dati (dx-data-grid) | `<gts-grid>` |
| `GtsForm` | Form di input (dx-form) | `<gts-form>` |
| `GtsFormPopup` | Form in popup | `<gts-form-popup>` |
| `GtsMessage` | Messaggi/Dialog | `<gts-message>` |
| `GtsTabs` | Contenitore tab | `<gts-tabs>` |
| `GtsLookup` | Campo lookup | `<gts-lookup>` |
| `GtsDateBox` | Selettore data | `<gts-datebox>` |

### Template Pagina Standard

```typescript
@Component({
  selector: 'app-pagename',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    GtsToolbar,
    GtsGrid,
    GtsForm,
    GtsFormPopup,
    GtsMessage
  ],
  template: `
    <ion-content>
      <gts-toolbar></gts-toolbar>
      <gts-grid></gts-grid>
      <gts-form></gts-form>
      <gts-form-popup></gts-form-popup>
      <gts-message></gts-message>
    </ion-content>
  `
})
export class PageNamePage implements OnInit, OnDestroy {
  prjId = 'GTSW';
  formId = 1;

  constructor(
    private gtsDataService: GtsDataService
  ) {}

  ngOnInit() {
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy() {
    // Cleanup subscriptions
  }
}
```

---

## Tipi di Editor per Campi

### Editor Testo

| Tipo | Descrizione | Opzioni |
|------|-------------|---------|
| `dxTextBox` | Input testo | `maxLength`, `placeholder` |
| `dxTextArea` | Area testo multilinea | `height`, `maxLength` |
| `dxNumberBox` | Input numerico | `min`, `max`, `format` |

### Editor Data/Ora

| Tipo | Descrizione | Opzioni |
|------|-------------|---------|
| `dxDateBox` | Selettore data | `type: "date"`, `displayFormat` |
| `dxDateBox` | Selettore data/ora | `type: "datetime"` |
| `dxDateBox` | Selettore ora | `type: "time"` |

### Editor Selezione

| Tipo | Descrizione | Opzioni |
|------|-------------|---------|
| `dxSelectBox` | Dropdown selezione | `dataSource`, `valueExpr`, `displayExpr` |
| `dxLookup` | Lookup con ricerca | `dataSource`, `valueExpr`, `displayExpr` |
| `dxTagBox` | Selezione multipla | `dataSource`, `valueExpr`, `displayExpr` |
| `dxRadioGroup` | Gruppo radio | `items`, `layout` |

### Editor Booleano

| Tipo | Descrizione | Opzioni |
|------|-------------|---------|
| `dxCheckBox` | Checkbox | `text` |
| `dxSwitch` | Switch on/off | `switchedOnText`, `switchedOffText` |

### Editor Speciali

| Tipo | Descrizione | Opzioni |
|------|-------------|---------|
| `dxColorBox` | Selettore colore | - |
| `dxSlider` | Slider | `min`, `max`, `step` |
| `dxRangeSlider` | Range slider | `start`, `end` |
| `dxFileUploader` | Upload file | `accept`, `maxFileSize` |
| `dxHtmlEditor` | Editor HTML | `toolbar` |

---

## Pattern per Pagine Comuni

### Pattern 1: Lista con Dettaglio (Master-Detail)

```javascript
// Struttura azioni tipica
{
  actions: [
    { name: "actInit", type: "getData", params: { dsName: "dsList" }, nextAction: "actSetListView" },
    { name: "actSetListView", type: "setView", params: { viewName: "vwList" } },
    { name: "actNew", type: "dsInsert", params: { dsName: "dsList" }, nextAction: "actSetEditView" },
    { name: "actEdit", type: "dsEdit", params: { dsName: "dsList" }, nextAction: "actSetEditView" },
    { name: "actSetEditView", type: "setView", params: { viewName: "vwEdit" } },
    { name: "actSave", type: "dsPost", params: { dsName: "dsList" }, nextAction: "actSetListView" },
    { name: "actCancel", type: "dsCancel", params: { dsName: "dsList" }, nextAction: "actSetListView" },
    { name: "actDelete", type: "showOKCancel", params: { msgName: "msgConfirmDelete", yesAction: "actDoDelete" } },
    { name: "actDoDelete", type: "dsDelete", params: { dsName: "dsList" }, nextAction: "actRefresh" },
    { name: "actRefresh", type: "dsRefresh", params: { dsName: "dsList" } }
  ]
}
```

### Pattern 2: Popup Edit

```javascript
{
  actions: [
    { name: "actInit", type: "getData", params: { dsName: "dsList" } },
    { name: "actNew", type: "dsInsert", params: { dsName: "dsList" }, nextAction: "actShowPopup" },
    { name: "actEdit", type: "dsEdit", params: { dsName: "dsList" }, nextAction: "actShowPopup" },
    { name: "actShowPopup", type: "showPopup", params: { popupName: "popEdit" } },
    { name: "actSave", type: "dsPost", params: { dsName: "dsList" }, nextAction: "actClosePopup" },
    { name: "actClosePopup", type: "hidePopup", params: { popupName: "popEdit" } }
  ]
}
```

### Pattern 3: Grid Inline Edit

```javascript
{
  actions: [
    { name: "actInit", type: "getData", params: { dsName: "dsList" } },
    { name: "actStartEdit", type: "gridSetEdit", params: { gridName: "grdMain" } },
    { name: "actStartInsert", type: "gridSetInsert", params: { gridName: "grdMain" } },
    { name: "actSaveGrid", type: "gridPostChanges", params: { gridName: "grdMain" } },
    { name: "actCancelGrid", type: "gridRollback", params: { gridName: "grdMain" } }
  ]
}
```

---

## Esempi di Metadati

### Esempio Completo: Pagina Users

```javascript
{
  prjId: "GTSW",
  formId: 1,
  formUrl: "users",
  formName: "frmUsers",
  pageTitle: "Gestione Utenti",
  initAction: "actInit",

  tabs: [
    { tabId: 1, tabName: "tabMain", tabText: "Utenti", tabOrder: 1 }
  ],

  views: [
    {
      viewId: 1,
      viewName: "vwList",
      viewType: 1,
      components: [
        { type: "toolbar", name: "tbList" },
        { type: "grid", name: "grdUsers" }
      ]
    },
    {
      viewId: 2,
      viewName: "vwEdit",
      viewType: 2,
      components: [
        { type: "toolbar", name: "tbEdit" },
        { type: "form", name: "frmEdit" }
      ]
    }
  ],

  toolbars: [
    {
      toolbarId: 1,
      toolbarName: "tbList",
      items: [
        { name: "btnNew", text: "Nuovo", icon: "add", action: "actNew" },
        { name: "btnEdit", text: "Modifica", icon: "edit", action: "actEdit" },
        { name: "btnDelete", text: "Elimina", icon: "trash", action: "actDelete" },
        { name: "btnRefresh", text: "Aggiorna", icon: "refresh", action: "actRefresh" }
      ]
    },
    {
      toolbarId: 2,
      toolbarName: "tbEdit",
      items: [
        { name: "btnSave", text: "Salva", icon: "save", action: "actSave", type: "success" },
        { name: "btnCancel", text: "Annulla", icon: "close", action: "actCancel" }
      ]
    }
  ],

  dataSets: [
    {
      dsId: 1,
      dsName: "dsUsers",
      sqlName: "sqlUsers",
      keyField: "user_id",
      autoLoad: true,
      pageSize: 50
    }
  ],

  sqls: [
    {
      sqlId: 1,
      sqlName: "sqlUsers",
      sqlText: "SELECT user_id, username, email, full_name, status, created_at FROM users WHERE status = :status",
      columns: [
        { name: "user_id", type: "number", pk: true },
        { name: "username", type: "string", size: 50 },
        { name: "email", type: "string", size: 100 },
        { name: "full_name", type: "string", size: 100 },
        { name: "status", type: "string", size: 1 },
        { name: "created_at", type: "date" }
      ],
      variables: [
        { name: ":status", type: "string", default: "A" }
      ]
    }
  ],

  grids: [
    {
      gridId: 1,
      gridName: "grdUsers",
      dsName: "dsUsers",
      allowFilter: true,
      allowSort: true,
      selectionMode: "single",
      rowDblClick: "actEdit",
      columns: [
        { name: "user_id", caption: "ID", width: 80, visible: false },
        { name: "username", caption: "Username", width: 150 },
        { name: "email", caption: "Email", width: 200 },
        { name: "full_name", caption: "Nome Completo", width: 200 },
        { name: "status", caption: "Stato", width: 80,
          editorType: "dxSelectBox",
          editorOptions: {
            items: [
              { value: "A", text: "Attivo" },
              { value: "I", text: "Inattivo" }
            ]
          }
        },
        { name: "created_at", caption: "Creato il", width: 120, format: "dd/MM/yyyy" }
      ]
    }
  ],

  forms: [
    {
      formId: 1,
      formName: "frmEdit",
      dsName: "dsUsers",
      colCount: 2,
      groups: [
        {
          groupName: "grpMain",
          groupCaption: "Dati Utente",
          fields: [
            { name: "username", caption: "Username", editorType: "dxTextBox", required: true, colSpan: 1 },
            { name: "email", caption: "Email", editorType: "dxTextBox", required: true, colSpan: 1,
              editorOptions: { mode: "email" }
            },
            { name: "full_name", caption: "Nome Completo", editorType: "dxTextBox", colSpan: 2 },
            { name: "status", caption: "Stato", editorType: "dxSelectBox", required: true,
              editorOptions: {
                items: [
                  { value: "A", text: "Attivo" },
                  { value: "I", text: "Inattivo" }
                ],
                valueExpr: "value",
                displayExpr: "text"
              }
            }
          ]
        }
      ]
    }
  ],

  actions: [
    { actionId: 1, name: "actInit", type: "getData", params: { dsName: "dsUsers" }, nextAction: "actSetListView" },
    { actionId: 2, name: "actSetListView", type: "setView", params: { viewName: "vwList" } },
    { actionId: 3, name: "actSetEditView", type: "setView", params: { viewName: "vwEdit" } },
    { actionId: 4, name: "actNew", type: "dsInsert", params: { dsName: "dsUsers" }, nextAction: "actSetEditView" },
    { actionId: 5, name: "actEdit", type: "dsEdit", params: { dsName: "dsUsers" }, nextAction: "actSetEditView" },
    { actionId: 6, name: "actSave", type: "dsPost", params: { dsName: "dsUsers" }, nextAction: "actSetListView" },
    { actionId: 7, name: "actCancel", type: "dsCancel", params: { dsName: "dsUsers" }, nextAction: "actSetListView" },
    { actionId: 8, name: "actDelete", type: "showOKCancel", params: { msgName: "msgConfirmDelete", yesAction: "actDoDelete" } },
    { actionId: 9, name: "actDoDelete", type: "dsDelete", params: { dsName: "dsUsers" }, nextAction: "actRefresh" },
    { actionId: 10, name: "actRefresh", type: "dsRefresh", params: { dsName: "dsUsers" } }
  ],

  messages: [
    {
      msgId: 1,
      msgName: "msgConfirmDelete",
      msgType: "confirm",
      msgTitle: "Conferma Eliminazione",
      msgText: "Sei sicuro di voler eliminare questo utente?",
      msgIcon: "warning"
    }
  ],

  condRules: [],
  pageFields: [],
  reportsGroups: []
}
```

---

## Convenzioni di Naming

### Prefissi Standard

| Prefisso | Tipo | Esempio |
|----------|------|---------|
| `act` | Action | `actInit`, `actSave`, `actDelete` |
| `ds` | Dataset | `dsUsers`, `dsOrders` |
| `sql` | Query SQL | `sqlUsers`, `sqlGetOrders` |
| `grd` | Grid | `grdUsers`, `grdOrderDetails` |
| `frm` | Form | `frmEdit`, `frmSearch` |
| `tb` | Toolbar | `tbMain`, `tbEdit` |
| `btn` | Button | `btnSave`, `btnCancel` |
| `vw` | View | `vwList`, `vwEdit` |
| `tab` | Tab | `tabMain`, `tabDetails` |
| `msg` | Message | `msgConfirm`, `msgError` |
| `rule` | Condition Rule | `ruleCanEdit`, `ruleShowField` |
| `pop` | Popup | `popEdit`, `popSearch` |
| `grp` | Group | `grpMain`, `grpAddress` |

### Azioni Standard

| Nome | Descrizione |
|------|-------------|
| `actInit` | Inizializzazione pagina |
| `actNew` | Nuovo record |
| `actEdit` | Modifica record |
| `actSave` | Salva modifiche |
| `actCancel` | Annulla modifiche |
| `actDelete` | Elimina record |
| `actRefresh` | Aggiorna dati |
| `actSearch` | Cerca/Filtra |
| `actExport` | Esporta dati |
| `actPrint` | Stampa |

---

## Schema SQLite Reale (Nomi Colonne)

Le tabelle SQLite usano nomi in UPPER_CASE con underscore. Ecco lo schema reale:

### GtsForms
```sql
PRJ_ID, FORM_ID, TXT_ID, FORM_TITLE, FORM_NAME, FORM_URL, INIT_ACTION
```

### GtsActions
```sql
PRJ_ID, FORM_ID, ACTION_NAME, ACTION_TYPE, CUSTOM_CODE, VIEW_NAME,
DATA_ADAPTER, ACTION_ORDER_LOGIC, CLSQL_ID, FIELDGRP_ID, ACTION_ACTIVE,
CLFLDGRP_ID, PAGE_FIELD_NAME, CLDATASET_OBJ_NAME, CLMSG_ID, EXEC_ACTION,
EXEC_COND_ARRAY, COND_ID, COND_VALUE, TOOLBAR_OBJ_NAME, CLGRID_OBJ_NAME
```

### GtsDataSets
```sql
PRJ_ID, FORM_ID, CLDATASET_OBJ_NAME, CLSQL_ID, CLDATASET_MASTER_OBJ_NAME,
CLDATASET_DATAADAPTER_OBJ_NAME, CLDATASET_INS_SQL_ID, CLDATASET_UPD_SQL_ID,
CLDATASET_DEL_SQL_ID, CLDATASET_IUD_TABLE
```

### GtsViews
```sql
PRJ_ID, FORM_ID, VIEW_NAME, OBJECT_TYPE, OBJECT_NAME, SELECTED,
SELECTED_OBJ_NAME, TABS_NAME, TAB_RN, VIEW_OBJECT_RN, EXEC_COND_ARRAY,
EXEC_COND_NOT_VISIBLE
```

### GtsViewsHdr
```sql
PRJ_ID, FORM_ID, VIEW_NAME, VIEW_LEVEL, VIEW_FLAG_ALWAYS_ACTIVE, VIEW_STYLE
```

### GtsToolbar
```sql
PRJ_ID, FORM_ID, TOOLBAR_DESCR, TOOLBAR_NAME, TOOLBAR_ID, TOOLBAR_FLAG_SUBMIT,
TOOLBAR_CSS_CLASS, TOOLBAR_GRID_AREA, TOOLBAR_FLAG_ACTION, TOOLBAR_FLAG_POPOVER,
TOOLBAR_ACTION_TARGET
```

### GtsToolbarItems
```sql
PRJ_ID, FORM_ID, OBJECT_NAME, LOCATION, TYPE, ACTION_NAME, TOOLBAR_ID,
BUTTON_ID, CLDATASET_OBJ_NAME, PAGE_FIELD_NAME, OBJECT_TEXT, ITEM_ORDER_LOGIC, TXT_ID
```

### GtsGrids
```sql
PRJ_ID, FORM_ID, CLSQL_ID, CLGRID_OBJ_NAME, CLGRID_FLAG_AUTOWIDTH,
CLGRID_FLAG_FILTER_ROW, CLGRID_FLAG_MULTI_SELECT, GTSGRID_FOCUSED_ROW,
GTSGRID_EXPORT_FLAG, GTSGRID_EXPORT_FORMATS, GTSGRID_ALLOW_COL_RESIZE,
GTSGRID_SEARCH_PANEL, GTSGRID_PAGE_SIZE, GTSGRID_ACTION_ON_SELECT,
GTSGRID_ACTION_ON_CLICK, GTSGRID_ACTION_ON_DCLICK, GTSGRID_CAPTION,
GTSGRID_CSS_CLASS, GTSGRID_GRID_AREA, GTSGRID_DD_STATUS, GTSGRID_DD_TASKS_GROUP,
GTSGRID_DD_ACTION_TO, GTSGRID_DD_ACTION_FROM
```

### GtsExecCondRules
```sql
PRJ_ID, FORM_ID, COND_ID, COND_DESCR, COND_VALUE, DATASET_NAME, FIELD_NAME,
FIELD_VALUES, COND_DS_VALUES
```

---

## Pattern Avanzati (da Form 10 - Role's Granted Objects)

### Pattern 4: Toolbar con Selettore Progetti (dropDownButton)

Questo pattern permette di avere un dropdown nella toolbar per selezionare il contesto (es. progetto).

```javascript
// GtsToolbarItems - Selettore progetti
{
  OBJECT_NAME: "selectedPrj",
  TYPE: "dropDownButton",              // Tipo speciale per dropdown
  LOCATION: "before",
  ACTION_NAME: "",                     // Nessuna action diretta
  CLDATASET_OBJ_NAME: "qProjects",     // Dataset che popola il dropdown
  PAGE_FIELD_NAME: "gtsFldqProjects_prjId"  // Campo pagina per il valore selezionato
}

// Alternativa: campo field nella toolbar
{
  OBJECT_NAME: "selectedPrjField",
  TYPE: "field",                       // Campo visualizzazione
  LOCATION: "before",
  CLDATASET_OBJ_NAME: "qProjects",
  PAGE_FIELD_NAME: "gtsFldqProjects_prjId"
}
```

### Pattern 5: Action Steps con Ordine (ACTION_ORDER_LOGIC)

Le azioni in GTSuite sono composte da **step multipli** con lo stesso ACTION_NAME ma diverso ACTION_ORDER_LOGIC:

```javascript
// mainInit - Sequenza di 6 step
[
  { ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 1, ACTION_TYPE: "setRule", COND_ID: 11, COND_VALUE: 1 },
  { ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 3, ACTION_TYPE: "getData", DATA_ADAPTER: "daProjects" },
  { ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 4, ACTION_TYPE: "getData", DATA_ADAPTER: "daPrjData" },
  { ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 5, ACTION_TYPE: "setView", VIEW_NAME: "mainView" },
  { ACTION_NAME: "mainInit", ACTION_ORDER_LOGIC: 6, ACTION_TYPE: "execCustom", CUSTOM_CODE: "setCtxProject" }
]
```

### Pattern 6: Esecuzione Condizionale (EXEC_COND_ARRAY)

Permette di eseguire step solo se una regola ha un certo valore:

```javascript
// Step eseguito solo se COND_ID 12 = 1 (contesto Menu)
{
  ACTION_NAME: "menuAddRole",
  ACTION_TYPE: "execCustom",
  CUSTOM_CODE: "MENU_ROLE_ADD",
  EXEC_COND_ARRAY: "[{\"Id\": 12, \"Value\": 1}]"  // JSON array
}

// Step eseguito solo se COND_ID 12 = 2 (contesto Object)
{
  ACTION_NAME: "objectAddRole",
  ACTION_TYPE: "execCustom",
  CUSTOM_CODE: "OBJ_ROLE_ADD",
  EXEC_COND_ARRAY: "[{\"Id\": 12, \"Value\": 2}]"
}
```

### Pattern 7: Action che Chiama Altre Actions (callAction)

Una singola action può chiamare azioni diverse in base al contesto:

```javascript
// addRole chiama menuAddRole o objectAddRole in base a EXEC_COND_ARRAY
[
  { ACTION_NAME: "addRole", ACTION_ORDER_LOGIC: 1, ACTION_TYPE: "callAction", EXEC_ACTION: "menuAddRole", EXEC_COND_ARRAY: "" },
  { ACTION_NAME: "addRole", ACTION_ORDER_LOGIC: 2, ACTION_TYPE: "callAction", EXEC_ACTION: "objectAddRole", EXEC_COND_ARRAY: "" }
]
```

### Pattern 8: Conditional Rules (setRule)

Le regole condizionali sono variabili di stato che controllano la UI:

```javascript
// GtsExecCondRules
[
  { COND_ID: 11, COND_DESCR: "Show Form PopUp => 1=Idle; 2=Show", COND_VALUE: 1 },
  { COND_ID: 12, COND_DESCR: "Menu/Obj => Menu:1; Obj:2", COND_VALUE: 1 },
  { COND_ID: 13, COND_DESCR: "Object Selected No:1; Yes:2", COND_VALUE: 1 }
]

// Uso nelle action per cambiare stato
{ ACTION_TYPE: "setRule", COND_ID: 11, COND_VALUE: 2 }  // Mostra popup
{ ACTION_TYPE: "setRule", COND_ID: 11, COND_VALUE: 1 }  // Nascondi popup
```

### Pattern 9: Drag & Drop tra Griglie

Configurazione per trascinare elementi tra griglie:

```javascript
// Griglia SORGENTE (tutti i ruoli disponibili)
{
  CLGRID_OBJ_NAME: "gtsGridAllRoles",
  GTSGRID_DD_STATUS: 1,              // 1 = sorgente drag
  GTSGRID_DD_TASKS_GROUP: "DDRoles"  // Gruppo per collegare le griglie
}

// Griglia DESTINAZIONE (ruoli assegnati al menu)
{
  CLGRID_OBJ_NAME: "gtsGridMenuRoles",
  GTSGRID_DD_STATUS: 2,                    // 2 = destinazione drop
  GTSGRID_DD_TASKS_GROUP: "DDRoles",
  GTSGRID_DD_ACTION_TO: "menuAddRole",     // Action su drop INTO questa griglia
  GTSGRID_DD_ACTION_FROM: "menuRemoveRole" // Action su drop FROM questa griglia
}

// Griglia DESTINAZIONE alternativa (ruoli assegnati all'oggetto)
{
  CLGRID_OBJ_NAME: "gtsGridObjectRoles",
  GTSGRID_DD_STATUS: 3,                     // 3 = altra destinazione
  GTSGRID_DD_TASKS_GROUP: "DDRoles",
  GTSGRID_DD_ACTION_TO: "objectAddRole",
  GTSGRID_DD_ACTION_FROM: "objectRemoveRole"
}
```

### Pattern 10: Views con CSS Grid Layout

Le viste usano CSS Grid per il posizionamento:

```javascript
// GtsViewsHdr
{
  VIEW_NAME: "mainView",
  VIEW_STYLE: `grid-template-columns: 1fr 1fr 1fr;
               display: grid;
               grid-template-areas:
               "R1C1 R1C1 R1C1"
               "R2C1 R2C2 R2C3"
               "R3C1 R3C1 R3C3"
               "R4C1 R4C2 R4C3"
               "R5C1 R5C2 R5C3";`
}

// GtsGrids - posizionamento con grid-area
{ CLGRID_OBJ_NAME: "gtsGridMenu", GTSGRID_GRID_AREA: "R5C1" }
{ CLGRID_OBJ_NAME: "gtsGridAllRoles", GTSGRID_GRID_AREA: "R5C2" }
{ CLGRID_OBJ_NAME: "gtsGridMenuRoles", GTSGRID_GRID_AREA: "R5C3" }
```

### Pattern 11: Vista con Abilitazione Componenti Condizionale

I componenti della vista possono essere abilitati solo quando un dataset è selezionato:

```javascript
// GtsViews - componente visibile solo se dataset selezionato
{
  VIEW_NAME: "showMenu",
  OBJECT_TYPE: "grid",
  OBJECT_NAME: "gtsGridMenuRoles",
  SELECTED: "Y",                    // Y = richiede selezione
  SELECTED_OBJ_NAME: "qMenu"        // Nome dataset che deve essere selezionato
}

// Pulsante abilitato solo con selezione
{
  VIEW_NAME: "showObj",
  OBJECT_TYPE: "toolbarItem",
  OBJECT_NAME: "objectAddRole",
  SELECTED: "Y",
  SELECTED_OBJ_NAME: "qObjects"
}
```

### Pattern 12: Viste Temporanee (Tmp)

Pattern per gestire stati transitori durante il caricamento:

```javascript
// Sequenza: setView "showMenuTmp" → carica dati → setView "showMenu"

// Vista temporanea (componenti disabilitati)
{ VIEW_NAME: "showMenuTmp", OBJECT_NAME: "gtsGridMenu", SELECTED: "U" }       // U = unconditional
{ VIEW_NAME: "showMenuTmp", OBJECT_NAME: "menuAddRole", SELECTED: "U" }

// Vista finale (componenti abilitati condizionalmente)
{ VIEW_NAME: "showMenu", OBJECT_NAME: "gtsGridMenuRoles", SELECTED: "Y", SELECTED_OBJ_NAME: "qMenu" }
{ VIEW_NAME: "showMenu", OBJECT_NAME: "menuAddRole", SELECTED: "Y", SELECTED_OBJ_NAME: "qAllRoles" }
```

---

## Esempio Completo: Form 10 - Role's Granted Objects

```javascript
{
  prjId: "GTSW",
  formId: 10,
  formUrl: "/gtsgrantedobjs",
  formName: "GrantedObjsComponent",
  pageTitle: "Role's Granted Objects",
  initAction: "mainInit",

  // 6 Dataset
  dataSets: [
    { dsName: "qProjects", dataAdapter: "daProjects", sqlId: 27 },
    { dsName: "qMenu", dataAdapter: "daPrjData", sqlId: 115 },
    { dsName: "qObjects", dataAdapter: "daPrjData", sqlId: 114 },
    { dsName: "qAllRoles", dataAdapter: "daPrjData", sqlId: 4 },
    { dsName: "qMenuRoles", dataAdapter: "daMenuRoles", sqlId: 116 },
    { dsName: "qObjectRoles", dataAdapter: "daObjectRoles", sqlId: 117 }
  ],

  // 3 Conditional Rules
  condRules: [
    { condId: 11, descr: "Show Form PopUp", values: { 1: "Idle", 2: "Show" }, default: 1 },
    { condId: 12, descr: "Menu/Obj", values: { 1: "Menu", 2: "Obj" }, default: 1 },
    { condId: 13, descr: "Object Selected", values: { 1: "No", 2: "Yes" }, default: 1 }
  ],

  // Toolbars
  toolbars: [
    {
      toolbarId: 1,
      toolbarName: "mainToolbar",
      gridArea: "R0C1",
      items: [
        { name: "mainTitle", type: "title", location: "center", text: "Role's Granted Objects" },
        { name: "selectedPrj", type: "dropDownButton", location: "before",
          dsName: "qProjects", pageField: "gtsFldqProjects_prjId" },
        { name: "menuAddRole", type: "button", location: "before", action: "menuAddRole", buttonId: 5 },
        { name: "menuRemoveRole", type: "button", location: "before", action: "menuRemoveRole", buttonId: 6 },
        { name: "objectAddRole", type: "button", location: "after", action: "objectAddRole", buttonId: 5 },
        { name: "objectRemoveRole", type: "button", location: "after", action: "objectRemoveRole", buttonId: 6 },
        { name: "mainInsertRow", type: "button", location: "before", action: "objectINS", buttonId: 10 },
        { name: "mainDeleteRow", type: "button", location: "before", action: "objectDEL", buttonId: 11 }
      ]
    }
  ],

  // Grids con Drag&Drop
  grids: [
    {
      gridName: "gtsGridMenu",
      sqlId: 115,
      caption: "PROJECT MENU",
      gridArea: "R5C1",
      onSelect: "menuDS",
      ddStatus: 0
    },
    {
      gridName: "gtsGridAllRoles",
      sqlId: 4,
      caption: "ALL ROLES",
      gridArea: "R5C2",
      onSelect: "allRolesSelect",
      onDblClick: "addRole",
      ddStatus: 1,
      ddGroup: "DDRoles"
    },
    {
      gridName: "gtsGridMenuRoles",
      sqlId: 116,
      caption: "SELECTED ROLES",
      gridArea: "R5C3",
      onSelect: "menuRolesDS",
      onDblClick: "menuRemoveRole",
      ddStatus: 2,
      ddGroup: "DDRoles",
      ddActionTo: "menuAddRole",
      ddActionFrom: "menuRemoveRole"
    },
    {
      gridName: "gtsGridObjects",
      sqlId: 114,
      caption: "PROJECT OBJECTS",
      gridArea: "R5C1",
      onSelect: "objectDS"
    },
    {
      gridName: "gtsGridObjectRoles",
      sqlId: 117,
      caption: "SELECTED ROLES",
      gridArea: "R5C3",
      onSelect: "objectRolesDS",
      onDblClick: "objectRemoveRole",
      ddStatus: 3,
      ddGroup: "DDRoles",
      ddActionTo: "objectAddRole",
      ddActionFrom: "objectRemoveRole"
    }
  ],

  // Views con layout
  views: [
    {
      viewName: "mainView",
      alwaysActive: true,
      style: "grid-template-columns: 1fr 1fr 1fr; display: grid;...",
      components: [
        { type: "toolbar", name: "mainToolbar", selected: "U" },
        { type: "toolbarItem", name: "mainTitle", selected: "U" },
        { type: "tabs", name: "mainTabs", selected: "U" }
      ]
    },
    {
      viewName: "showMenu",
      components: [
        { type: "grid", name: "gtsGridMenu", selected: "U" },
        { type: "grid", name: "gtsGridAllRoles", selected: "Y", selectedDs: "qMenu" },
        { type: "grid", name: "gtsGridMenuRoles", selected: "Y", selectedDs: "qMenu" },
        { type: "toolbarItem", name: "menuAddRole", selected: "Y", selectedDs: "qAllRoles" },
        { type: "toolbarItem", name: "menuRemoveRole", selected: "Y", selectedDs: "qMenuRoles" }
      ]
    },
    {
      viewName: "showObj",
      components: [
        { type: "grid", name: "gtsGridObjects", selected: "U" },
        { type: "grid", name: "gtsGridAllRoles", selected: "Y", selectedDs: "qObjects" },
        { type: "grid", name: "gtsGridObjectRoles", selected: "Y", selectedDs: "qObjects" },
        { type: "toolbarItem", name: "objectAddRole", selected: "Y", selectedDs: "qObjects" },
        { type: "toolbarItem", name: "mainDeleteRow", selected: "Y", selectedDs: "qObjects" }
      ]
    }
  ],

  // Actions con step multipli
  actions: [
    // mainInit - 6 step
    { name: "mainInit", order: 1, type: "setRule", condId: 11, condValue: 1 },
    { name: "mainInit", order: 3, type: "getData", dataAdapter: "daProjects" },
    { name: "mainInit", order: 4, type: "getData", dataAdapter: "daPrjData" },
    { name: "mainInit", order: 5, type: "setView", viewName: "mainView" },
    { name: "mainInit", order: 6, type: "execCustom", customCode: "setCtxProject" },

    // menuDS - selezione menu
    { name: "menuDS", order: 1, type: "setView", viewName: "showMenuTmp" },
    { name: "menuDS", order: 2, type: "selectDS", dsName: "qMenu" },
    { name: "menuDS", order: 3, type: "getData", dataAdapter: "daMenuRoles" },
    { name: "menuDS", order: 4, type: "execCustom", customCode: "MENU_ROLES" },
    { name: "menuDS", order: 5, type: "callAction", execAction: "showMenu" },

    // addRole - branch condizionale
    { name: "addRole", order: 1, type: "callAction", execAction: "menuAddRole" },
    { name: "addRole", order: 2, type: "callAction", execAction: "objectAddRole" },

    // menuAddRole - esecuzione condizionale
    { name: "menuAddRole", order: 1, type: "execCustom", customCode: "MENU_ROLE_ADD",
      execCondArray: [{ Id: 12, Value: 1 }] },
    { name: "menuAddRole", order: 2, type: "execProc", sqlId: 118,
      execCondArray: [{ Id: 12, Value: 1 }] },
    { name: "menuAddRole", order: 3, type: "unselectDS", dsName: "qAllRoles",
      execCondArray: [{ Id: 12, Value: 1 }] },

    // objectAddRole - esecuzione condizionale
    { name: "objectAddRole", order: 1, type: "execCustom", customCode: "OBJ_ROLE_ADD",
      execCondArray: [{ Id: 12, Value: 2 }] },
    { name: "objectAddRole", order: 2, type: "execProc", sqlId: 119,
      execCondArray: [{ Id: 12, Value: 2 }] },
    { name: "objectAddRole", order: 3, type: "unselectDS", dsName: "qAllRoles",
      execCondArray: [{ Id: 12, Value: 2 }] }
  ]
}
```

---

## Note per la Generazione AI

### Checklist per Generare Metadati

1. **Identificare il tipo di pagina**:
   - Lista semplice
   - Master-Detail
   - Form singolo
   - Dashboard

2. **Definire i dataset necessari**:
   - Query principale
   - Lookup per dropdown
   - Dataset detail (se master-detail)

3. **Creare le viste**:
   - Vista lista (con griglia)
   - Vista edit (con form)
   - Viste aggiuntive se necessario

4. **Definire toolbar per ogni vista**:
   - Pulsanti CRUD standard
   - Pulsanti specifici

5. **Configurare griglia**:
   - Colonne visibili
   - Tipi editor inline
   - Formati visualizzazione

6. **Configurare form**:
   - Gruppi logici
   - Campi con editor appropriati
   - Validazioni

7. **Definire catena azioni**:
   - Init → Load data → Set view
   - New → Insert → Show edit
   - Save → Post → Back to list
   - Delete → Confirm → Delete → Refresh

8. **Aggiungere messaggi**:
   - Conferme eliminazione
   - Messaggi errore
   - Notifiche successo

### Esempio Prompt per Generazione

```
Genera i metadati GTSuite per una pagina di gestione [ENTITA] con:
- Campi: [lista campi con tipi]
- Operazioni: [CRUD standard / custom]
- Layout: [lista/dettaglio / popup / inline edit]
- Lookup: [campi con dropdown e sorgenti]
- Validazioni: [regole]
```

---

## Appendice: Mapping Tipi Dati

### Da Database a Editor

| Tipo DB | EditorType | Format |
|---------|------------|--------|
| VARCHAR/NVARCHAR | dxTextBox | - |
| TEXT | dxTextArea | - |
| INT/NUMBER | dxNumberBox | "#,##0" |
| DECIMAL | dxNumberBox | "#,##0.00" |
| DATE | dxDateBox | "dd/MM/yyyy" |
| DATETIME | dxDateBox | "dd/MM/yyyy HH:mm" |
| BIT/BOOLEAN | dxCheckBox | - |
| BLOB | dxFileUploader | - |

### Formati Comuni

```javascript
// Numeri
"#,##0"           // Intero con separatore migliaia
"#,##0.00"        // Decimale 2 cifre
"#,##0.00 €"      // Valuta Euro
"$ #,##0.00"      // Valuta Dollaro
"#,##0.00 %"      // Percentuale

// Date
"dd/MM/yyyy"      // Data italiana
"MM/dd/yyyy"      // Data americana
"yyyy-MM-dd"      // Data ISO
"dd/MM/yyyy HH:mm"// Data e ora
"HH:mm"           // Solo ora
```

---

*Documento generato per l'uso con AI nella generazione di metadati GTSuite*
