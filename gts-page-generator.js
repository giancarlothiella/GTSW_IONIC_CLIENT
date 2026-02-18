#!/usr/bin/env node

/**
 * GTS Page Generator v2.0
 * Generates new GTSuite pages with automatic component registry update
 * 
 * Usage: node gts-page-generator.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(colors.blue + prompt + colors.reset, (answer) => {
      resolve(answer.trim());
    });
  });
}

function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function toCamelCase(str) {
  return str
    .split('-')
    .map((word, index) => 
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('');
}

async function updateComponentRegistry(projectCode, pageName, componentClassName, registryPath) {
  try {
    // Leggi il file del registry
    const content = fs.readFileSync(registryPath, 'utf8');
    
    // Crea l'entry da aggiungere
    const registryKey = `${projectCode}/${toCamelCase(pageName)}`;
    const importPath = `../../features/${projectCode}/${pageName}/${pageName}.page`;
    const newEntry = `  '${registryKey}': () => import('${importPath}').then(m => m.${componentClassName}),`;
    
    // Trova il commento del progetto o l'ultimo entry
    const projectComment = `// ${projectCode} Components`;
    const lines = content.split('\n');
    
    let insertIndex = -1;
    let foundProjectSection = false;
    
    // Cerca la sezione del progetto
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(projectComment)) {
        foundProjectSection = true;
        // Trova l'ultima entry di questa sezione
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith('//')) {
            // Trovato il commento della prossima sezione
            insertIndex = j;
            break;
          }
          if (lines[j].includes("'") && lines[j].includes(':')) {
            // Questa è un'entry, continua
            insertIndex = j + 1;
          }
        }
        break;
      }
    }
    
    // Se non ha trovato la sezione, inserisci prima di "// Altri progetti"
    if (insertIndex === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('// Altri progetti')) {
          insertIndex = i;
          // Aggiungi anche il commento della sezione se non esiste
          if (!foundProjectSection) {
            lines.splice(insertIndex, 0, '', projectComment);
            insertIndex += 2;
          }
          break;
        }
      }
    }
    
    // Se ancora non ha trovato, inserisci prima della chiusura }
    if (insertIndex === -1) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('};')) {
          insertIndex = i;
          break;
        }
      }
    }
    
    // Controlla se l'entry esiste già
    if (content.includes(`'${registryKey}':`)) {
      log(`\n⚠️  Entry già presente nel registry: ${registryKey}`, 'yellow');
      const overwrite = await question('   Vuoi sovrascriverla? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        return false;
      }
      
      // Rimuovi la vecchia entry
      const updatedLines = lines.filter(line => !line.includes(`'${registryKey}':`));
      lines.length = 0;
      lines.push(...updatedLines);
      
      // Ricalcola l'insertIndex
      insertIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(projectComment)) {
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim().startsWith('//') || lines[j].includes('};')) {
              insertIndex = j;
              break;
            }
            if (lines[j].includes("'") && lines[j].includes(':')) {
              insertIndex = j + 1;
            }
          }
          break;
        }
      }
    }
    
    // Inserisci la nuova entry
    lines.splice(insertIndex, 0, newEntry);
    
    // Scrivi il file aggiornato
    fs.writeFileSync(registryPath, lines.join('\n'));
    
    return true;
  } catch (error) {
    log(`\n❌ Errore nell'aggiornamento del registry: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n═══════════════════════════════════════════════════', 'bright');
  log('   GTS Page Generator v2.0 - With Registry Support', 'bright');
  log('═══════════════════════════════════════════════════\n', 'bright');

  try {
    // 1. Project Code
    const projectCode = await question('📦 Project code (es. GTR, GTSW, DCW): ');
    if (!projectCode) {
      log('❌ Project code is required!', 'red');
      process.exit(1);
    }

    // 2. Page Name
    const pageName = await question('📄 Page name (kebab-case, es. clienti, std-table): ');
    if (!pageName) {
      log('❌ Page name is required!', 'red');
      process.exit(1);
    }

    // 3. Form ID
    const formIdInput = await question('🔢 Form ID (press Enter for dynamic/generic page): ');
    const formId = formIdInput ? parseInt(formIdInput) : -1;
    const isDynamic = formId === -1;

    // 4. Component Prefix
    const defaultPrefix = projectCode + '_';
    const componentPrefix = await question(`🏷️  Component class prefix [${defaultPrefix}]: `) || defaultPrefix;

    // 5. Include Loader - sempre incluso di default
    const includeLoader = true;

    // 6. Include Reports
    const includeReportsInput = await question('📊 Include GTS Reports? (y/N): ');
    const includeReports = includeReportsInput.toLowerCase() === 'y';

    // 7. Base Path
    const defaultBasePath = `src/app/features/${projectCode}`;
    const basePath = await question(`📁 Base path [${defaultBasePath}]: `) || defaultBasePath;

    // 8. Component Registry Path
    const defaultRegistryPath = 'src/app/core/config/component-registry.ts';
    const registryPath = await question(`📋 Component registry path [${defaultRegistryPath}]: `) || defaultRegistryPath;

    // 9. Auto-update Registry
    const autoUpdateInput = await question('🔧 Auto-update component registry? (Y/n): ');
    const autoUpdate = autoUpdateInput.toLowerCase() !== 'n';

    const componentClassName = componentPrefix + toPascalCase(pageName) + 'Component';

    log('\n' + '─'.repeat(50), 'bright');
    log('📋 Configuration Summary:', 'bright');
    log('─'.repeat(50), 'bright');
    log(`  Project Code:       ${projectCode}`, 'yellow');
    log(`  Page Name:          ${pageName}`, 'yellow');
    log(`  Form ID:            ${isDynamic ? 'Dynamic (from URL)' : formId}`, 'yellow');
    log(`  Component Class:    ${componentClassName}`, 'yellow');
    log(`  Include Reports:    ${includeReports ? 'Yes' : 'No'}`, 'yellow');
    log(`  Target Path:        ${basePath}/${pageName}/`, 'yellow');
    log(`  Registry Update:    ${autoUpdate ? 'Automatic' : 'Manual'}`, 'yellow');
    log('─'.repeat(50) + '\n', 'bright');

    const confirm = await question('✅ Proceed with generation? (Y/n): ');
    if (confirm.toLowerCase() === 'n') {
      log('❌ Generation cancelled.', 'yellow');
      process.exit(0);
    }

    // Generate files
    const targetPath = path.join(basePath, pageName);
    
    // Create directory if not exists
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
      log(`\n✅ Created directory: ${targetPath}`, 'green');
    } else {
      log(`\n⚠️  Directory already exists: ${targetPath}`, 'yellow');
      const overwrite = await question('   Overwrite files? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        log('❌ Generation cancelled.', 'yellow');
        process.exit(0);
      }
    }

    // Generate TypeScript component
    const tsContent = generateTsComponent(projectCode, pageName, formId, componentPrefix, isDynamic, includeLoader, includeReports);
    const tsFile = path.join(targetPath, `${pageName}.page.ts`);
    fs.writeFileSync(tsFile, tsContent);
    log(`✅ Generated: ${pageName}.page.ts`, 'green');

    // Generate HTML template
    const htmlContent = generateHtmlTemplate(includeLoader, includeReports);
    const htmlFile = path.join(targetPath, `${pageName}.page.html`);
    fs.writeFileSync(htmlFile, htmlContent);
    log(`✅ Generated: ${pageName}.page.html`, 'green');

    // Generate empty SCSS
    const scssFile = path.join(targetPath, `${pageName}.page.scss`);
    fs.writeFileSync(scssFile, '// Add custom styles here\n');
    log(`✅ Generated: ${pageName}.page.scss`, 'green');

    // Update Component Registry
    log('\n' + '═'.repeat(50), 'bright');
    log('📋 Component Registry Update:', 'bright');
    log('═'.repeat(50), 'bright');

    const registryKey = `${projectCode}/${toCamelCase(pageName)}`;
    const registryEntry = `'${registryKey}': () => import('../../features/${projectCode}/${pageName}/${pageName}.page').then(m => m.${componentClassName}),`;

    if (autoUpdate) {
      if (fs.existsSync(registryPath)) {
        log(`\n🔧 Updating ${registryPath}...`, 'cyan');
        const success = await updateComponentRegistry(projectCode, pageName, componentClassName, registryPath);
        if (success) {
          log(`✅ Component registry updated successfully!`, 'green');
          log(`   Added entry: ${registryKey}`, 'green');
        } else {
          log(`⚠️  Please update registry manually`, 'yellow');
          showManualRegistryInstructions(registryKey, registryEntry);
        }
      } else {
        log(`\n⚠️  Registry file not found: ${registryPath}`, 'yellow');
        showManualRegistryInstructions(registryKey, registryEntry);
      }
    } else {
      showManualRegistryInstructions(registryKey, registryEntry);
    }

    // Generate routing instructions
    log('\n' + '═'.repeat(50), 'bright');
    log('📝 Next Steps:', 'bright');
    log('═'.repeat(50), 'bright');
    
    log('\n1️⃣  Component registry updated ✅', 'green');
    
    log('\n2️⃣  Navigate to the page:', 'yellow');
    if (isDynamic) {
      log(`   this.router.navigate(['/${pageName}'], { queryParams: { formId: YOUR_FORM_ID } });`, 'blue');
    } else {
      log(`   this.router.navigate(['/${pageName}']);`, 'blue');
    }

    log('\n3️⃣  Configure metadata in GTS Designer:', 'yellow');
    log('   • Load SQL (SELECT statement)', 'blue');
    log('   • Create page with URL: ' + pageName, 'blue');
    log('   • Add to Menu Tree with registry key: ' + registryKey, 'blue');
    log('   • Configure Dataset, Grid, Form', 'blue');
    log('   • Upload to MongoDB server', 'blue');

    log('\n✨ Page generation completed successfully!', 'green');
    log('═'.repeat(50) + '\n', 'bright');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

function showManualRegistryInstructions(registryKey, registryEntry) {
  log('\n📝 Add this entry to component-registry.ts:', 'yellow');
  log('─'.repeat(50), 'bright');
  log(registryEntry, 'cyan');
  log('─'.repeat(50), 'bright');
  log(`\nRegistry key: ${registryKey}`, 'yellow');
}

function generateTsComponent(projectCode, pageName, formId, componentPrefix, isDynamic, includeLoader = false, includeReports = false) {
  const className = componentPrefix + toPascalCase(pageName) + 'Component';
  const selector = `app-${pageName}`;

  // Build imports dynamically
  let gtsImports = `import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsGridPopupComponent } from '../../../core/gts-open-source/gts-grid-popup/gts-grid-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';`;

  if (includeLoader) {
    gtsImports += `\nimport { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';`;
  }
  if (includeReports) {
    gtsImports += `\nimport { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component';`;
  }

  // Build component imports array
  let componentImports = `    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsGridPopupComponent,
    GtsMessageComponent`;

  if (includeLoader) {
    componentImports += `,\n    GtsLoaderComponent`;
  }
  if (includeReports) {
    componentImports += `,\n    GtsReportsComponent`;
  }

  return `import { Component, OnInit, OnDestroy, inject } from '@angular/core';
${isDynamic ? "import { ActivatedRoute } from '@angular/router';\n" : ''}import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { Subscription } from 'rxjs';

// Import GTS Components
${gtsImports}

@Component({
  selector: '${selector}',
  standalone: true,
  imports: [
    CommonModule,

    // GTS Components
${componentImports}
  ],
  templateUrl: './${pageName}.page.html',
  styleUrls: ['./${pageName}.page.scss']
})
export class ${className} implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = '${projectCode}';
  formId: number = ${formId};

  ${isDynamic ? 'private route = inject(ActivatedRoute);\n  ' : ''}private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

  constructor() {
    addIcons({ arrowBackOutline });
  }

  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;
  toolbarListenerSubs: Subscription | undefined;

  ngOnInit(): void {
    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
    .getAppLoaderListener()
    .subscribe((loading) => {
      this.loading = loading;
    })

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
    .getAppViewListener()
    .subscribe((actualView) => {
      if (actualView !== undefined && actualView !== '') {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
        if (this.metaData.views.filter((view: any) => view.viewName === actualView)[0] !== undefined)
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
      }
    });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
    .getFormReqListener()
    .subscribe((formRequest) => {
      let reply: any = {
        valid: true
      };

      //===== START FORM REQUEST CUSTOM CODE =====
      if (formRequest.typeRequest === 'form') {
        // Dispatch by formName (objectName from metadata)
        // if (formRequest.formName === 'myFormName') {
        //   this.calcMyForm(formRequest);
        // }
      }
      //===== END FORM REQUEST CUSTOM CODE =====
      this.gtsDataService.sendFormReply(reply);
    });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
    .getPageCustomListener()
    .subscribe(async (customCode) => {
      //===== START CUSTOM CODE =====

      // Riattiva il loader per il custom code
      this.gtsDataService.sendAppLoaderListener(true);

      await this.getCustomData(this.prjId, this.formId, customCode, this.actualView);

      // Disattiva il loader dopo il custom code
      setTimeout(() => {
        this.gtsDataService.sendAppLoaderListener(false);
      }, 300);

      //===== END CUSTOM CODE =====
    });

    // Toolbar Events Listener
    this.toolbarListenerSubs = this.gtsDataService
    .getToolbarEventListener()
    .subscribe((data) => {
      //===== START CUSTOM TOOLBAR EVENT CODE =====

      //===== END CUSTOM TOOLBAR EVENT CODE =====
    });

${isDynamic ? `    // Get formId from query params and run page
    this.route.queryParams.subscribe(params => {
      this.formId = params['formId'] ? parseInt(params['formId']) : -1;

      // Run Page after getting formId
      if (this.formId !== -1) {
        this.gtsDataService.runPage(this.prjId, this.formId);
      } else {
        console.error('Invalid formId:', this.formId);
      }
    });` : `    // Run Page with hardcoded formId
    this.gtsDataService.runPage(this.prjId, this.formId);`}
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
    this.toolbarListenerSubs?.unsubscribe();
  }

  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  loading: boolean = true;
  pageData: any = {};
  viewStyle: string = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  //========= PAGE FUNCTIONS =================
  async getCustomData(prjId: string, formId: number, customCode: string, actualView: string) {
    //===== START CUSTOM CODE =====

    //===== END CUSTOM CODE =====
  }

  //========= FORM CALCULATIONS =================

  /** Helper: get numeric value - tries formData first, falls back to pageData */
  private getFieldVal(fd: any[], name: string): number {
    const f = fd.find((f: any) => f.objectName === name);
    if (f?.value !== undefined && f?.value !== null) return parseFloat(f.value) || 0;
    // Fallback to pageData (field in a different form)
    const val = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, name);
    return parseFloat(val) || 0;
  }

  /** Helper: set field value in formData (if present) and always sync pageData */
  private setFieldVal(fd: any[], name: string, value: number) {
    const f = fd.find((f: any) => f.objectName === name);
    if (f) f.value = value;
    this.gtsDataService.setPageFieldValue(this.prjId, this.formId, name, value);
  }

}
`;
}

function generateHtmlTemplate(includeLoader, includeReports) {
  let template = `<div class="pageFormat">
${includeLoader ? '  <app-gts-loader></app-gts-loader>\n\n' : ''}  <app-gts-toolbar
    [prjId]="prjId"
    [formId]="formId"
    [objectName]="'mainToolbar'"
    [customData]="customData"
    (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
  ></app-gts-toolbar>

  <div
    [style]="viewStyle"
    >
    @for (element of metaData.tabs; track element) {
      @if (element.visible) {
        <app-gts-tabs
          [style]="'grid-area: '+element.gridArea"
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="element.objectName"
        ></app-gts-tabs>
      }
    }
${includeReports ? `
    @for (element of metaData.reportsGroups; track element) {
      @if (element.visible) {
        <app-gts-reports
          [style]="'grid-area: '+element.gridArea"
          [prjId]="prjId"
          [formId]="formId"
          [fieldGrpId]="element.fieldGrpId"
        ></app-gts-reports>
      }
    }
` : ''}
    @for (element of metaData.toolbars; track element) {
      @if (element.visible && element.objectName != 'mainToolbar' && !element.toolbarFlagSubmit) {
        <app-gts-toolbar
          [style]="'grid-area: '+element.gridArea"
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="element.objectName"
          [customCssClass]="element.customCssClass"
          (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
        ></app-gts-toolbar>
      }
    }

    @for (element of metaData.grids; track element) {
      @if (element.visible && !element.showPopUp) {
        <app-gts-grid
          [style]="'grid-area: '+element.gridArea"
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="element.objectName"
        ></app-gts-grid>
      }
      @if (element.visible && element.showPopUp) {
        <app-gts-grid-popup
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="element.objectName"
        ></app-gts-grid-popup>
      }
    }

    @for (element of metaData.forms; track element) {
      @if (element.visible && !element.groupShowPopUp) {
        <app-gts-form
          [style]="'grid-area: '+element.gridArea"
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="element.objectName"
        ></app-gts-form>
      }
      @if (element.visible && element.groupShowPopUp) {
        <app-gts-form-popup
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="element.objectName"
        ></app-gts-form-popup>
      }
    }
  </div>

  <app-gts-message
    [prjId]="prjId"
    [formId]="formId"
  ></app-gts-message>
</div>
`;
  return template;
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});