# Migration Notes - GTSuite Open Source Components

## 📋 Migrazione in corso

Questo documento traccia la migrazione dei componenti GTS verso librerie open source.

### Stack Open Source

| Componente | Da (DevExtreme) | A (Open Source) | Stato |
|-----------|-----------------|-----------------|-------|
| Tabs | DxTabsModule | Ionic Segment | ✅ Completato |
| Message | DxPopupModule | Ionic Alert | ✅ Completato |
| Toolbar | DxToolbarModule | Ionic Toolbar | ✅ Completato |
| Grid | DxDataGridModule | AG Grid Community | 🔄 In corso (Phase 1) |
| Form | DxFormModule | PrimeNG | 🔄 Pianificato |

## ✅ Pagine Migrate

### GTSW - Setup (formId: 3)

**Data migrazione**: 2026-01-17
**Componenti sostituiti**:
- ✅ `gts-tabs` → Ionic Segment

**File modificati**:
- `src/app/features/GTSW/setup/setup.page.ts`
  - Cambiato import da `core/gts/gts-tabs` a `core/gts-open-source/gts-tabs`

**Risultato**:
- ✅ Build successful
- ✅ Nessun cambiamento al template HTML necessario
- ✅ Piena compatibilità con metadati esistenti
- ✅ Stile migliorato rispetto a DevExtreme originale
- ✅ Tab selezionato chiaramente evidenziato con bordo spesso
- ✅ Icone ben distanziate dal testo
- ✅ Nessuna freccia di scroll visibile
- ✅ Gestione automatica di ID mancanti nei metadati

**Test completati**:
- ✅ I tab si vedono correttamente
- ✅ Il click sui tab funziona perfettamente
- ✅ Le azioni associate ai tab vengono eseguite correttamente
- ⏳ Testare su mobile (i tab dovrebbero mostrare solo icone)

**Rollback**: In caso di problemi, ripristinare l'import originale:
```typescript
import { GtsTabsComponent } from '../../../core/gts/gts-tabs/gts-tabs.component';
```

---

### GTSW - Setup (formId: 3) - gts-message

**Data migrazione**: 2026-01-17
**Componenti sostituiti**:
- ✅ `gts-message` → Ionic Alert

**File modificati**:
- `src/app/features/GTSW/setup/setup.page.ts`
  - Cambiato import da `core/gts/gts-message` a `core/gts-open-source/gts-message`

**Risultato**:
- ✅ Build successful
- ✅ Nessun cambiamento al template HTML necessario
- ✅ Piena compatibilità con metadati esistenti
- ✅ Usa Ionic Alert nativo invece di DevExtreme Popup
- ✅ Supporta tutti i tipi di messaggio (Q, I, W, E)
- ✅ Stili colorati per tipo di messaggio
- ✅ Testi multilingua (OK, Cancel, Close)
- ✅ Stili definiti in `src/global.scss` (gli Alert Ionic si creano dinamicamente fuori dalla gerarchia del componente)
- ✅ Bottoni OK/Cancel con colori personalizzati (dark blue per OK, grigio per Cancel)
- ✅ Titolo con gradiente colorato per tipo di messaggio
- ✅ Effetti hover su bottoni

**Test da fare**:
- [ ] Verificare messaggio di conferma cancellazione record
- [ ] Verificare messaggi info/warning/error
- [ ] Testare testi multilingua
- [ ] Testare su mobile

**Rollback**: In caso di problemi, ripristinare l'import originale:
```typescript
import { GtsMessageComponent } from '../../../core/gts/gts-message/gts-message.component';
```

---

### GTSW - Setup, GTR Fatture, GTSW Granted-Objs - gts-toolbar

**Data migrazione**: 2026-01-18
**Componenti sostituiti**:
- ✅ `gts-toolbar` → Ionic Toolbar + Popover

**File modificati**:
- `src/app/features/GTSW/setup/setup.page.ts` - Cambiato import
- `src/app/features/GTR/fatture/fatture.page.ts` - Cambiato import
- `src/app/features/GTSW/granted-objs/granted-objs.page.ts` - Cambiato import

**File creati**:
- `src/app/core/gts-open-source/gts-toolbar/gts-toolbar.component.ts`
- `src/app/core/gts-open-source/gts-toolbar/gts-toolbar.component.html`
- `src/app/core/gts-open-source/gts-toolbar/gts-toolbar.component.scss`
- `src/app/core/gts-open-source/gts-toolbar/action-menu-popover.component.ts`

**Risultato**:
- ✅ Build successful
- ✅ Nessun cambiamento ai metadati necessario
- ✅ Piena compatibilità con metadati esistenti
- ✅ Supporta tutti i tipi di item: button, title, field, dropdown
- ✅ Action menu come popover (appare dal bottone invece che in fondo allo schermo)
- ✅ Icone PNG/SVG custom supportate nei bottoni
- ✅ Icone PNG/SVG custom supportate nell'action menu
- ✅ Dropdown con altezza 32px allineata ai fields
- ✅ Field con label normale e valore bold
- ✅ Formattazione automatica delle date nei fields (Date: dd/MM/yyyy, DateTime: dd/MM/yyyy HH:mm:ss)
- ✅ Stili globali per select popover in `global.scss`
- ✅ Stili globali per action menu popover in `global.scss`
- ✅ Gestione ExpressionChangedAfterItHasBeenCheckedError con setTimeout
- ✅ Responsive: su mobile nasconde testi bottoni (solo icone)

**Dettagli tecnici**:
- Usa `IonToolbar`, `IonButtons`, `IonButton`, `IonSelect`, `IonText`
- Usa `PopoverController` per action menu invece di `ActionSheet`
- Popover creato dinamicamente tramite lazy import
- Supporto per PNG (`stdImageId`), SVG (`iconId`), e ionicons
- Slot-based positioning (start/end)
- CSS variables di Ionic per styling
- Global CSS per componenti creati dinamicamente
- Formattazione date: usa `PageService.formatDate()` e `formatDateTime()` basandosi su `dataType` del campo

**Test completati**:
- ✅ Setup page - bottoni con icone
- ✅ GTR Fatture - bottoni con action list
- ✅ GTSW Granted-Objs - dropdown, fields, e bottoni
- ✅ Formattazione date nei campi field (es. "31/03/2025" invece di "2025-03-30T22:00:00.000Z")

**Issues noti**:
- ExpressionChangedAfterItHasBeenCheckedError quando si seleziona una riga nella grid (sarà risolto dopo migrazione grid)

**Rollback**: In caso di problemi, ripristinare l'import originale:
```typescript
import { GtsToolbarComponent } from '../../../core/gts/gts-toolbar/gts-toolbar.component';
```

## 🎯 Prossime pagine da migrare

### Priorità Alta
1. **GTSW - Projects** (ha tabs)
2. **GTSW - DB Connections** (ha tabs)
3. **GTSW - Users** (ha tabs)

### Priorità Media
4. **GTSW - Languages** (ha tabs)
5. **GTSW - Mail Services** (ha tabs)

### Note sulla migrazione Grid

Quando inizieremo la migrazione delle griglie a AG Grid:

**Vantaggi attesi**:
- Performance: AG Grid gestisce 100k+ righe senza problemi
- Virtual scrolling nativo
- Export Excel/CSV integrato
- Column pinning, resizing, reordering
- Infinite scroll

**Complessità**:
- Mappatura column definitions dai metadati
- Cell renderers custom (icone, link, buttons)
- Context menu
- Master/Detail views
- Inline editing

**Stima**: 2-3 settimane per la migrazione completa di gts-grid

## 📊 Metriche

### Before (DevExtreme)
- Bundle size: ~8.5 MB
- Costo licensing: €€€
- Vendor lock-in: Sì

### After (Open Source) - Obiettivo
- Bundle size: ~5 MB (stima con tree-shaking)
- Costo licensing: €0
- Vendor lock-in: No

### Performance (da verificare dopo migrazione grid)
- Rendering 10k rows: TBD
- Memory usage: TBD
- Initial load time: TBD

## 🔧 Best Practices per la migrazione

1. **Una pagina alla volta**: Migrare e testare incrementalmente
2. **Mantenere rollback facile**: Tenere i vecchi componenti fino a fine migrazione
3. **Documentare differenze**: Annotare ogni differenza di comportamento
4. **Test su mobile**: Ionic è mobile-first, verificare sempre su dispositivi
5. **Accessibilità**: Verificare keyboard navigation e screen readers

## 📝 Checklist pre-migrazione pagina

Prima di migrare una pagina:

- [ ] Identificare tutti i componenti GTS usati
- [ ] Verificare che esistano versioni open source
- [ ] Leggere i metadati della pagina
- [ ] Identificare custom code che potrebbe essere impattato
- [ ] Preparare test plan

## 📝 Checklist post-migrazione pagina

Dopo aver migrato una pagina:

- [ ] Build successful
- [ ] No console errors
- [ ] UI visivamente corretta
- [ ] Funzionalità testate
- [ ] Performance accettabile
- [ ] Mobile responsive
- [ ] Aggiornare questo documento

## 🐛 Issues Conosciuti

Nessuno al momento.

## 💡 Suggerimenti

- **Ionic Segment** (tabs): Se i tab non hanno icone, considerare l'uso di Ionicons nativi invece di SVG custom
- **AG Grid** (futura): Usare AG Grid Community, non serve la versione Enterprise
- **PrimeNG** (futura): Usare il tema Material per consistenza con Ionic

## 📚 Risorse

- [Ionic Components](https://ionicframework.com/docs/components)
- [AG Grid Angular](https://www.ag-grid.com/angular-data-grid/)
- [PrimeNG](https://primeng.org/)
- [Ionic Segment](https://ionicframework.com/docs/api/segment)

---

**Ultimo aggiornamento**: 2026-01-17
**Versione Angular**: 21
**Versione Ionic**: 8
