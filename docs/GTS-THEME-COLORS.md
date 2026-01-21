# GTS Theme Colors Documentation

Documentazione dei colori utilizzati nei componenti GTS open-source per futura tematizzazione personalizzata.

## Colori Principali

### Toolbar & Navigation
- **Background principale**: `linear-gradient(135deg, #1e293b 0%, #334155 100%)` - Grigio ardesia scuro
- **Testo**: `#ffffff` (bianco)
- **Usato in**:
  - Dialog header (form popup)
  - Toolbar principale pagine

### Form Components

#### Form Title
- **Background**: `rgb(171, 195, 243)` - Azzurro chiaro
- **Testo**: `rgb(16, 16, 179)` - Blu scuro
- **Usato in**:
  - `.form001Title` - Titolo principale form
  - `ion-toolbar.form001Toolbar` - Toolbar form (OK/Annulla)

#### Form Fields (Standard)
- **Background**: `rgb(234, 235, 247)` - Grigio-azzurro molto chiaro
- **Border**: `#ced4da` - Grigio chiaro
- **Focus border**: `#00008b` - Blu scuro
- **Usato in**:
  - `.form001Field` - Campi standard
  - Input, textarea, select, datepicker standard

#### Primary Key Fields
- **Background**: `rgb(187, 214, 240)` - Azzurro chiaro
- **Testo**: `rgb(23, 36, 155)` - Blu intenso
- **Usato in**:
  - `.form001PKField` - Campi PK (TextBox, TextArea)
  - `.form001LookUpPKField` - Lookup PK
  - `.form001RadioGroupPKField` - Radio group PK

#### Group Headers (Sezioni)
- **Background**: `rgb(86, 99, 126)` - Blu-grigio medio
- **Testo**: `whitesmoke` (#f5f5f5)
- **Usato in**:
  - `.form001GroupHdr` - Intestazioni sezioni form (es. "Dati Documento", "Dati Pagamento")

#### Read-only Fields
- **Background**: `rgb(191, 215, 238)` - Azzurro pallido
- **Testo**: `rgb(7, 0, 0)` - Quasi nero
- **Usato in**:
  - Input/textarea con `disabled` o `readonly`

#### Error State
- **Background**: `#ffebee` - Rosa chiaro
- **Border**: `#d32f2f` - Rosso
- **Testo label**: `#d32f2f` - Rosso
- **Usato in**:
  - `.form001FieldError` - Campi con errore di validazione

### Buttons

#### Primary Buttons
- **Background**: (default PrimeNG primary)
- **Hover**: (default PrimeNG hover)
- **Usato in**: Bottoni principali azioni

#### Secondary Buttons (Toolbar form)
- **Background**: `white`
- **Testo**: `#333` - Grigio scuro
- **Border**: `#ddd` - Grigio chiaro
- **Hover background**: `#f0f0f0` - Grigio molto chiaro
- **Hover border**: `#bbb` - Grigio medio
- **Usato in**: Bottoni OK/Annulla nelle form

### Grid Components

#### AG Grid Theme
- **Usato**: AG Grid Material theme
- **Accent color**: `#00008b` - Blu scuro (per selezioni e focus)

### Dialog & Overlays

#### Modal Overlay
- **Background**: `rgba(0, 0, 0, 0.4)` - Nero semitrasparente (40%)
- **Usato in**: Sfondo oscurato quando aperta una dialog

#### Dialog
- **Border radius**: `8px`
- **Box shadow**: `0 4px 20px rgba(0, 0, 0, 0.15)`

## Colori Secondari

### Links & Interactive Elements
- **Focus outline**: `rgba(0, 0, 139, 0.15)` - Blu scuro semitrasparente

### Borders Standard
- **Border primario**: `#ced4da` - Grigio chiaro
- **Border form fields**: `#a5a3a392` - Grigio con alpha

### Placeholder Text
- **Color**: `#6c757d` - Grigio medio
- **Opacity**: `0.7`

## Note per Implementazione Futura

### Opzione 1: CSS Variables
Convertire tutti questi valori in CSS variables in `src/theme/variables.scss`:

```scss
:root {
  --gts-primary-color: #1e293b;
  --gts-primary-light: #334155;
  --gts-form-title-bg: rgb(171, 195, 243);
  --gts-form-title-text: rgb(16, 16, 179);
  // ... etc
}
```

### Opzione 2: Theme Service
Creare un servizio Angular che carica i colori da:
- File JSON locale (`src/assets/config/theme.json`)
- Database (per cliente/tenant)
- Environment configuration

Il servizio può iniettare dinamicamente le CSS variables al caricamento dell'app.

### Opzione 3: Multiple Themes
Supportare più temi predefiniti (light/dark/custom) con switch runtime.

## File Modificati

### Componenti Form (PrimeNG)
- `src/app/core/gts-open-source/gts-form/gts-form.component.scss`
- `src/app/core/gts-open-source/gts-form-popup/gts-form-popup.component.scss`

### Toolbar (Ionic)
- `src/app/core/gts-open-source/gts-toolbar/gts-toolbar.component.scss`

### Grid (AG Grid)
- `src/app/core/gts-open-source/gts-grid/gts-grid.component.scss`

### Lookup (PrimeNG Dialog + AG Grid)
- `src/app/core/gts-open-source/gts-lookup/gts-lookup.component.scss`

### Global Styles
- `src/global.scss`
- `src/theme/variables.scss`

---

**Ultimo aggiornamento**: 2026-01-20
**Versione componenti**: PrimeNG v21.0.0, AG Grid v35.0.0, Ionic v8
