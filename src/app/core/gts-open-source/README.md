# GTS Open Source Components

Questa cartella contiene le versioni open source dei componenti GTS, migrati da DevExtreme a librerie open source:

- **Ionic**: Componenti UI mobile-first
- **AG Grid**: Griglia dati enterprise
- **PrimeNG**: Form components e UI widgets

## Obiettivi della migrazione

1. **Zero vendor lock-in**: Tutte le librerie sono open source
2. **Compatibilità retroattiva**: Stessa interfaccia dei componenti GTS originali
3. **Migrazione incrementale**: I componenti possono essere sostituiti uno alla volta
4. **Performance**: Librerie moderne e performanti
5. **Community support**: Librerie con community attive e ampia documentazione

## Struttura

```
gts-open-source/
├── gts-tabs/          ✅ Migrato (Ionic Segment)
├── gts-grid/          🔄 In pianificazione (AG Grid)
├── gts-form/          🔄 In pianificazione (PrimeNG)
├── gts-toolbar/       🔄 In pianificazione (Ionic Toolbar + PrimeNG)
├── gts-message/       🔄 In pianificazione (Ionic Toast/Alert)
└── README.md
```

## Componenti migrati

### ✅ gts-tabs (Ionic Segment)

**Libreria**: Ionic Segment
**Stato**: Completato
**Compatibilità**: 100% con metadati esistenti

#### Interfaccia

```typescript
@Input() prjId: string;
@Input() formId: number;
@Input() objectName: string;
```

#### Metadati supportati

```typescript
{
  tabsData: [
    {
      id: string,
      text: string,
      iconId?: number,        // Path SVG custom: /assets/icons/icon_XXX.svg
      ionIcon?: string,       // Nome icona Ionicons (es. 'home', 'settings')
      visible?: boolean,      // Default: true
      disabled?: boolean,     // Default: false
      actionName?: string     // Azione da eseguire al click
    }
  ],
  tabIndex?: number          // Indice tab selezionato
}
```

#### Differenze con versione DevExtreme

| Feature | DevExtreme | Ionic | Note |
|---------|-----------|-------|------|
| Icone SVG custom | ✅ | ✅ | Stesso path |
| Icone native | ❌ | ✅ | Supporto Ionicons aggiunto |
| Responsive | ⚠️ | ✅ | Mobile: solo icone |
| Animazioni | ✅ | ✅ | Smooth transitions |
| Temi | DevExtreme | CSS Variables | Più flessibile |

#### Come usare

Sostituisci l'import nel component:

```typescript
// Prima (DevExtreme)
import { GtsTabsComponent } from '../../../core/gts/gts-tabs/gts-tabs.component';

// Dopo (Ionic)
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
```

Il template HTML rimane identico:

```html
<app-gts-tabs
  [prjId]="prjId"
  [formId]="formId"
  [objectName]="'mainTabs'"
></app-gts-tabs>
```

## Prossimi componenti

### 🔄 gts-grid (AG Grid Community)

**Priorità**: Alta
**Complessità**: Alta
**Tempo stimato**: 2-3 settimane

AG Grid è la griglia enterprise più performante per Angular.

#### Feature principali
- ✅ Sorting, filtering, grouping
- ✅ Virtual scrolling (100k+ righe)
- ✅ Column resizing, reordering, pinning
- ✅ Cell editing inline
- ✅ Export Excel/CSV
- ✅ Master/Detail views
- ✅ Custom cell renderers

#### Metadati da mappare
- Column definitions → AG Grid ColDef
- Data binding → rowData
- Events → AG Grid events
- Actions → Cell renderers / Context menu

### 🔄 gts-form (PrimeNG)

**Priorità**: Media
**Complessità**: Media
**Tempo stimato**: 1-2 settimane

PrimeNG offre tutti i form controls necessari.

#### Components da usare
- InputText, InputNumber, InputTextarea
- Calendar (date/datetime)
- Dropdown, MultiSelect
- Checkbox, RadioButton
- FileUpload
- Editor (rich text)

### 🔄 gts-toolbar (Ionic + PrimeNG)

**Priorità**: Media
**Complessità**: Bassa
**Tempo stimato**: 1 settimana

Combinazione Ionic Toolbar + PrimeNG Buttons.

### 🔄 gts-message (Ionic Toast/Alert)

**Priorità**: Bassa
**Complessità**: Bassa
**Tempo stimato**: 3-5 giorni

Ionic offre Toast e Alert pronti all'uso.

## Vantaggi della migrazione

### Tecnici
- **Performance**: AG Grid gestisce milioni di righe senza problemi
- **Bundle size**: Librerie tree-shakable, solo ciò che serve viene incluso
- **TypeScript**: Tipizzazione completa su tutte le librerie
- **Angular 21**: Pieno supporto delle ultime feature Angular

### Economici
- **Zero licensing**: Nessun costo per DevExtreme
- **Manutenzione**: Community attive, fix rapidi
- **Hiring**: Più facile trovare sviluppatori che conoscono Ionic/AG Grid

### Strategici
- **Indipendenza**: Nessun vendor lock-in
- **Flessibilità**: Possibilità di customizzare profondamente
- **Futuro**: Librerie con roadmap chiare e supporto lungo termine

## Testing

Durante la migrazione, testare:

1. **Compatibilità metadati**: Tutti i metadati esistenti devono funzionare
2. **Performance**: Verificare che le performance siano uguali o migliori
3. **UI/UX**: L'aspetto deve essere coerente
4. **Responsive**: Funzionamento su mobile/tablet
5. **Accessibilità**: Keyboard navigation, screen readers

## Rollback

I componenti vecchi rimarranno disponibili in `core/gts/` fino a migrazione completata.
È possibile tornare indietro semplicemente cambiando l'import.

## Contribuire

Per aggiungere un nuovo componente migrato:

1. Creare cartella `gts-NOME/`
2. Implementare con stessa interfaccia (@Input/@Output)
3. Documentare differenze e feature aggiuntive
4. Testare su una pagina reale
5. Aggiornare questo README

## Licenze

- **Ionic**: MIT License
- **AG Grid Community**: MIT License
- **PrimeNG**: MIT License

Tutte le librerie sono completamente gratuite per uso commerciale.
