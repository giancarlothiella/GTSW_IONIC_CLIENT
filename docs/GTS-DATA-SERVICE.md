# GTS Data Service - Documentazione Tecnica

## Panoramica

Il `GtsDataService` è il servizio centrale che gestisce tutto il flusso dati dell'applicazione GTS. Funge da intermediario tra:
- **Backend API** (chiamate HTTP al server)
- **Componenti UI** (griglie, form, toolbar)
- **Stato della pagina** (metadati, dati, regole)

---

## Array Principali Gestiti

### 1. `metaData: any[]`
**Scopo**: Contiene la struttura/configurazione delle pagine caricate dal server.

**Struttura**:
```typescript
metaData = [
  {
    prjId: string,           // ID progetto
    formId: number,          // ID form/pagina
    pageData: {
      page: { initAction },  // Configurazione pagina
      views: [],             // Viste disponibili
      pageFields: [],        // Campi della pagina con valori
      forms: [],             // Form di data entry
      grids: [],             // Configurazione griglie
      tabs: [],              // Tabs
      toolbars: [],          // Toolbar
      actions: [],           // Azioni definite
      dataSets: [],          // Definizione dataset (sqlId, keys, ecc.)
      sqls: [],              // Query SQL definite
      condRules: [],         // Regole condizionali
      customMsg: []          // Messaggi personalizzati
    }
  }
]
```

**Uso**: Configurazione statica della pagina, definizione campi, struttura UI.

---

### 2. `pageData: any[]`
**Scopo**: Contiene i dati effettivi caricati dal database per ogni pagina.

**Struttura**:
```typescript
pageData = [
  {
    prjId: string,
    formId: number,
    dataAdapter: string,     // Nome del data adapter
    data: [
      {
        dataSetName: string,
        rows: any[],           // Righe dati dal DB
        selectedRows: any[],   // Righe selezionate
        selectedKeys: any[],   // Chiavi delle righe selezionate
        isSelected: boolean,   // Dataset ha selezione attiva
        status: 'idle' | 'insert' | 'edit',
        totalCount: number,    // Conteggio totale (per paginazione)
        limitApplied: boolean, // Se limite iniziale applicato
        // ... altri campi limite
      }
    ]
  }
]
```

**Uso**: Dati runtime, selezioni utente, stato editing.

---

### 3. `pageRules: any[]`
**Scopo**: Gestisce le regole condizionali che controllano visibilità/comportamento elementi UI.

**Struttura**:
```typescript
pageRules = [
  {
    prjId: string,
    formId: number,
    condId: number,     // ID regola
    condValue: number   // Valore attuale (es: 0=nascosto, 1=visibile)
  }
]
```

**Uso**: Abilitare/disabilitare elementi in base a condizioni (es: stato riga selezionata).

---

### 4. `dbLog: any[]`
**Scopo**: Log delle operazioni database eseguite nella sessione.

**Struttura**:
```typescript
dbLog = [
  {
    logDate: Date,
    prjId: string,
    formId: number,
    action: 'getData' | 'execProc' | 'dsPost',
    sqlId: number | null,
    dataAdapter: string | null,
    dataSetName: string | null,
    params: any,
    connCode: string
  }
]
```

---

## Sistema di Listeners (RxJS Subjects)

I listeners permettono la comunicazione tra servizio e componenti:

| Listener | Tipo | Scopo |
|----------|------|-------|
| `appViewListener` | `Subject<string>` | Notifica cambio vista |
| `appLoaderListener` | `Subject<boolean>` | Mostra/nascondi loader globale |
| `gridReloadListener` | `Subject<string>` | Ricarica completa griglia |
| `gridRowUpdateListener` | `Subject<{...}>` | Aggiorna singola riga (preserva selezione) |
| `gridSelectListener` | `Subject<any>` | Notifica selezione griglia |
| `messageListener` | `Subject<any>` | Mostra messaggi/dialogs |
| `lookUpListener` | `Subject<any>` | Apre lookup popup |
| `formReqListener` | `Subject<any>` | Richieste form |
| `formRepListener` | `Subject<any>` | Risposte form |
| `pageCustomListener` | `Subject<string>` | Esegue codice custom |
| `aiChatListener` | `Subject<any>` | Apre AI Chat |
| `toolbarEventListener` | `Subject<any>` | Eventi toolbar |
| `actionEventListener` | `Subject<any>` | Eventi debug azioni |

---

## Metodi Principali

### Inizializzazione Pagina

#### `runPage(prjId, formId)`
Carica e inizializza una pagina.
```typescript
async runPage(prjId: string, formId: number): Promise<void>
```
- Carica metaData dal server se non in cache
- Esegue l'azione iniziale (`initAction`)
- Notifica i componenti via `appViewListener`

#### `runGtsPage(prjId, formId)` [private]
Logica interna di caricamento pagina.

---

### Gestione Dati

#### `getData(prjId, formId, dataAdapter, params)` [private]
Carica dati dal database.
```typescript
async getData(prjId: string, formId: number, dataAdapter: string, dataParams: any): Promise<boolean>
```
- Chiama API `db/getData`
- Popola `pageData` con i risultati
- Converte tipi numerici da stringhe
- Gestisce limiti di caricamento iniziale

#### `reloadDataWithFilters(prjId, formId, dataAdapter, dataSetName, gridFilters, skipInitialLimit)`
Ricarica dati con filtri griglia (usato da "Load All").
```typescript
async reloadDataWithFilters(...): Promise<any>
```

#### `removeData(prjId, formId, dataAdapter)`
Rimuove un dataAdapter da pageData.

---

### Gestione DataSet

#### `dataSetRefresh(prjId, formId, dataSetName, all)`
Aggiorna dati dataset.
```typescript
async dataSetRefresh(prjId: string, formId: number, dataSetName: string, all: boolean): Promise<boolean>
```
- `all=true`: Ricarica tutto il dataset, notifica `gridReloadListener`
- `all=false`: Aggiorna solo riga selezionata, notifica `gridRowUpdateListener`

#### `dataSetAction(prjId, formId, action)`
Esegue azioni CRUD su dataset (insert/update/delete).

#### `dataSetPost(prjId, formId, dataSetName, gridName)`
Salva modifiche griglia al database.

#### `setDataSetStatus(prjId, formId, dataSetName, status, action)`
Imposta stato dataset: `'idle'`, `'insert'`, `'edit'`.

#### `getDataSetStatus(prjId, formId, dataSetName)`
Restituisce stato corrente del dataset.

#### `setDataSetSelected(prjId, formId, dataSetName, isSelected, goToFirstRow, goToLastRow)`
Gestisce selezione dataset.
- `isSelected=false`: Deseleziona, svuota selectedRows/Keys
- `goToFirstRow=true`: Seleziona prima riga
- `goToLastRow=true`: Seleziona ultima riga

---

### Gestione Campi Pagina

#### `setPageFieldValue(prjId, formId, name, value)`
Imposta valore campo in metaData.pageFields.

#### `getPageFieldValue(prjId, formId, name)`
Legge valore campo da metaData.pageFields.

#### `getFormData(prjId, formId, clFldGrpId)`
Copia valori da pageFields ai campi form.

#### `saveFormData(prjId, formId, clFldGrpId, setDataSet, dataSetName, status)`
Salva valori form su pageFields e opzionalmente su dataset.

#### `clearFields(prjId, formId, clFldGrpId)`
Azzera valori campi di un form group.

#### `pkLock/pkUnlock(prjId, formId, clFldGrpId)`
Blocca/sblocca campi chiave primaria.

---

### Gestione Viste e Regole

#### `setView(prjId, formId, viewName, isPrevious)` [private]
Cambia vista attiva.
- Gestisce stack `previousView` per navigazione indietro
- Applica regole condizionali su visibilità elementi

#### `setPageRule(prjId, formId, condId, condValue)`
Imposta valore regola condizionale.

#### `checkPageRule(prjId, formId, condRules)`
Verifica se condizioni sono soddisfatte.

#### `setPageDataSetRule(prjId, formId, dataAdapter, dataSetName)`
Aggiorna regole basate su valori riga selezionata.

---

### Esecuzione Azioni

#### `runAction(prjId, formId, objectName, iStart, debugLevel)`
**Metodo centrale** - Esegue sequenza di azioni definite nei metadati.

```typescript
async runAction(prjId: string, formId: number, objectName: string,
                iStart: number = 0, debugLevel: number = 0): Promise<void>
```

**Tipi di Azione Supportati**:

| actionType | Descrizione |
|------------|-------------|
| `getData` | Carica dati da dataAdapter |
| `removeData` | Rimuove dataAdapter da pageData |
| `setView` | Cambia vista |
| `setPreviousView` | Torna a vista precedente |
| `goToFirstRow` | Seleziona prima riga dataset |
| `goToLastRow` | Seleziona ultima riga dataset |
| `selectDS` | Attiva selezione dataset |
| `unselectDS` | Disattiva selezione dataset |
| `execCustom` | Esegue codice custom (notifica pageCustomListener) |
| `execProc` | Esegue stored procedure |
| `setRule` | Imposta regola condizionale |
| `getFormData` | Copia valori da pageFields a form |
| `clearFields` | Azzera campi form |
| `pkLock` | Blocca campi PK |
| `pkUnlock` | Sblocca campi PK |
| `saveFormData` | Salva form su pageFields |
| `getExportedData` | Carica dati da SQL campo (lookup) |
| `dsInsert` | Imposta dataset in modalità insert |
| `dsEdit` | Imposta dataset in modalità edit |
| `dsCancel` | Annulla modifiche dataset |
| `dsRefresh` | Ricarica tutto il dataset |
| `dsRefreshSel` | Ricarica solo riga selezionata |
| `dsPost` | Salva modifiche dataset (insert/update) |
| `dsDelete` | Elimina riga selezionata |
| `showMsg` | Mostra messaggio informativo |
| `showOKCancel` | Mostra dialog OK/Annulla |
| `gridSetIdle` | Imposta griglia in modalità idle |
| `gridSetEdit` | Imposta griglia in modalità edit |
| `gridSetInsert` | Imposta griglia in modalità insert |
| `gridAllowDelete` | Abilita delete su griglia |
| `gridPostChanges` | Salva modifiche griglia |
| `gridRollback` | Annulla modifiche griglia |
| `gridSetAIMode` | Apre AI Chat per import dati griglia |
| `formAIAssist` | Apre AI Chat per compilazione form |

---

### Comunicazione Server

#### `postServerData(apiRoute, url, params)`
Chiamata HTTP generica al backend.
```typescript
async postServerData(apiRoute: string, url: string, params: any): Promise<any>
```
**apiRoute**: `'data'`, `'db'`, `'file'`, `'auth'`, `'mail'`, `'setup'`, `'task'`, `'prj'`

#### `execProc(prjId, formId, sqlId, params, sqlParams, dataSet)` [private]
Esegue stored procedure.

#### `execMethod(apiRoute, methodName, params)`
Esegue metodo server generico.

---

### Metodi Utility

#### `buildParamsArray(prjId, formId, action)` [private]
Costruisce array parametri per query SQL/MongoDB da valori pageFields.

#### `getConnCode(prjId)` [private]
Restituisce codice connessione database per il progetto.

#### `getDataSetAdapter(prjId, formId, dataSetName)`
Trova dataAdapter che contiene un dataset.

#### `getDataSetSqlId(prjId, formId, dataSetName, status)`
Restituisce sqlId appropriato per operazione (select/insert/update/delete).

---

### Metodi Debug

```typescript
getActualDebugData()      // Stato completo per debug panel
getAllMetaData()          // Array metaData completo
getAllPageData()          // Array pageData completo
getAllPageRules()         // Array pageRules completo
getAllDbLog()             // Log operazioni DB
getActualConnCode()       // Connection code corrente
```

---

## Flusso Dati Tipico

```
1. Utente naviga a pagina
   └─> runPage(prjId, formId)
       └─> Carica metaData dal server
       └─> runAction(initAction)
           └─> getData() - carica dati
           └─> setView() - imposta vista

2. Utente seleziona riga in griglia
   └─> gts-grid notifica selezione
   └─> pageData.selectedRows aggiornato
   └─> setPageDataSetRule() - aggiorna regole
   └─> setView() - aggiorna visibilità elementi

3. Utente modifica e salva
   └─> runAction(saveAction)
       └─> dsEdit/dsInsert - imposta stato
       └─> saveFormData() - salva su pageFields
       └─> dsPost - esegue SQL
       └─> dsRefreshSel - ricarica riga
           └─> sendGridRowUpdate() - aggiorna griglia (preserva selezione)
```

---

## Note Importanti

1. **metaData** è la configurazione (struttura), **pageData** sono i dati runtime
2. I listeners usano RxJS per comunicazione disaccoppiata
3. `dsRefresh` ricarica tutto, `dsRefreshSel` solo la riga selezionata
4. `gridRowUpdateListener` aggiorna senza perdere selezione
5. Le regole (`pageRules`) controllano visibilità/stato elementi UI
6. Ogni operazione DB viene loggata in `dbLog`
