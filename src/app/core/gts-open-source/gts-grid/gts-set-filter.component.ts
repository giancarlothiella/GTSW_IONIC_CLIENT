import { IFilterComp, IFilterParams } from 'ag-grid-community';

/**
 * GTS Set Filter Component
 *
 * Custom AG Grid filter that shows a dropdown with checkboxes for each unique value.
 * This replicates the AG Grid Enterprise Set Filter functionality for the Community version.
 *
 * Features:
 * - Displays all unique values from the column
 * - Checkboxes for selecting/deselecting values
 * - "Select All" / "Deselect All" functionality
 * - Search box to filter the list of values
 * - Support for null/empty values
 */
export class GtsSetFilterComponent implements IFilterComp {
  private params!: IFilterParams;
  private gui!: HTMLElement;
  private filterValues: Set<any> = new Set(); // Selected values
  private allValues: any[] = []; // All unique values in the column
  private searchText: string = '';
  private selectAllCheckbox!: HTMLInputElement;
  private valueListContainer!: HTMLElement;
  private searchInput!: HTMLInputElement;

  // Callbacks
  private hidePopup?: () => void;

  init(params: IFilterParams): void {
    this.params = params;
    this.createGui();
    this.extractUniqueValues();

    // Initialize with all values selected BEFORE rendering (no filter active)
    this.allValues.forEach(v => this.filterValues.add(this.normalizeValue(v)));

    // Now render with filterValues already populated
    this.renderValueList();
    this.updateSelectAllState();
  }

  /**
   * Create the filter GUI structure
   */
  private createGui(): void {
    this.gui = document.createElement('div');
    this.gui.className = 'gts-set-filter';
    this.gui.innerHTML = `
      <div class="gts-set-filter-container">
        <div class="gts-set-filter-search">
          <input type="text" class="gts-set-filter-search-input" placeholder="Search...">
        </div>
        <div class="gts-set-filter-controls">
          <label class="gts-set-filter-select-all">
            <input type="checkbox" checked>
            <span>(Select All)</span>
          </label>
        </div>
        <div class="gts-set-filter-list"></div>
        <div class="gts-set-filter-buttons">
          <button class="gts-set-filter-btn gts-set-filter-btn-apply">Apply</button>
          <button class="gts-set-filter-btn gts-set-filter-btn-reset">Reset</button>
        </div>
      </div>
    `;

    // Apply styles
    this.applyStyles();

    // Get references to elements
    this.searchInput = this.gui.querySelector('.gts-set-filter-search-input') as HTMLInputElement;
    this.selectAllCheckbox = this.gui.querySelector('.gts-set-filter-select-all input') as HTMLInputElement;
    this.valueListContainer = this.gui.querySelector('.gts-set-filter-list') as HTMLElement;

    // Setup event listeners
    this.searchInput.addEventListener('input', () => this.onSearchChange());
    this.selectAllCheckbox.addEventListener('change', () => this.onSelectAllChange());

    const applyBtn = this.gui.querySelector('.gts-set-filter-btn-apply') as HTMLButtonElement;
    const resetBtn = this.gui.querySelector('.gts-set-filter-btn-reset') as HTMLButtonElement;

    applyBtn.addEventListener('click', () => this.applyFilter());
    resetBtn.addEventListener('click', () => this.resetFilter());
  }

  /**
   * Apply inline styles for the filter
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .gts-set-filter {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
      }
      .gts-set-filter-container {
        width: 220px;
        max-height: 350px;
        display: flex;
        flex-direction: column;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      .gts-set-filter-search {
        padding: 8px;
        border-bottom: 1px solid #eee;
      }
      .gts-set-filter-search-input {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 12px;
        box-sizing: border-box;
      }
      .gts-set-filter-search-input:focus {
        outline: none;
        border-color: #3880ff;
      }
      .gts-set-filter-controls {
        padding: 6px 8px;
        border-bottom: 1px solid #eee;
        background: #fafafa;
      }
      .gts-set-filter-select-all {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-weight: 500;
        color: #333;
      }
      .gts-set-filter-select-all input {
        cursor: pointer;
      }
      .gts-set-filter-list {
        flex: 1;
        overflow-y: auto;
        max-height: 200px;
        padding: 4px 0;
      }
      .gts-set-filter-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        cursor: pointer;
      }
      .gts-set-filter-item:hover {
        background: #f0f0f0;
      }
      .gts-set-filter-item input {
        cursor: pointer;
      }
      .gts-set-filter-item label {
        cursor: pointer;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gts-set-filter-item-null {
        font-style: italic;
        color: #888;
      }
      .gts-set-filter-buttons {
        display: flex;
        gap: 6px;
        padding: 8px;
        border-top: 1px solid #eee;
        background: #fafafa;
      }
      .gts-set-filter-btn {
        flex: 1;
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 3px;
        background: white;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      .gts-set-filter-btn:hover {
        background: #f0f0f0;
      }
      .gts-set-filter-btn-apply {
        background: #3880ff;
        color: white;
        border-color: #3880ff;
      }
      .gts-set-filter-btn-apply:hover {
        background: #2a6fd8;
      }
      .gts-set-filter-no-matches {
        padding: 12px 8px;
        text-align: center;
        color: #888;
        font-style: italic;
      }
    `;

    // Only add styles once
    if (!document.getElementById('gts-set-filter-styles')) {
      style.id = 'gts-set-filter-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Extract all unique values from the column data
   */
  private extractUniqueValues(): void {
    const uniqueSet = new Set<any>();

    this.params.api.forEachNode(node => {
      if (node.data) {
        const value = this.params.getValue(node);
        uniqueSet.add(this.normalizeValue(value));
      }
    });

    // Convert to array and sort
    this.allValues = Array.from(uniqueSet).sort((a, b) => {
      // Null/empty values go to the end
      if (a === null || a === undefined || a === '') return 1;
      if (b === null || b === undefined || b === '') return -1;

      // String comparison for others
      const strA = String(a).toLowerCase();
      const strB = String(b).toLowerCase();
      return strA.localeCompare(strB);
    });
  }

  /**
   * Normalize value for consistent comparison
   */
  private normalizeValue(value: any): any {
    if (value === null || value === undefined || value === '') {
      return null; // Treat all "empty" values as null
    }
    return value;
  }

  /**
   * Get display text for a value
   */
  private getDisplayText(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '(Blanks)';
    }
    return String(value);
  }

  /**
   * Render the list of values with checkboxes
   */
  private renderValueList(): void {
    this.valueListContainer.innerHTML = '';

    const searchLower = this.searchText.toLowerCase();
    const filteredValues = this.allValues.filter(v => {
      const displayText = this.getDisplayText(v).toLowerCase();
      return displayText.includes(searchLower);
    });

    if (filteredValues.length === 0) {
      this.valueListContainer.innerHTML = '<div class="gts-set-filter-no-matches">No matches found</div>';
      return;
    }

    filteredValues.forEach(value => {
      const normalizedValue = this.normalizeValue(value);
      const isChecked = this.filterValues.has(normalizedValue);
      const displayText = this.getDisplayText(value);
      const isNull = normalizedValue === null;

      const item = document.createElement('div');
      item.className = 'gts-set-filter-item';
      item.innerHTML = `
        <input type="checkbox" ${isChecked ? 'checked' : ''} data-value="${normalizedValue === null ? '__null__' : normalizedValue}">
        <label class="${isNull ? 'gts-set-filter-item-null' : ''}">${this.escapeHtml(displayText)}</label>
      `;

      const checkbox = item.querySelector('input') as HTMLInputElement;
      const label = item.querySelector('label') as HTMLLabelElement;

      // Only handle checkbox change event - this fires when user clicks checkbox directly
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation(); // Prevent bubbling to row click
        this.onValueCheckboxChange(normalizedValue, checkbox.checked);
      });

      // Allow clicking the label/row to toggle checkbox
      label.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        this.onValueCheckboxChange(normalizedValue, checkbox.checked);
      });

      this.valueListContainer.appendChild(item);
    });
  }

  /**
   * Escape HTML entities for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle search input change
   */
  private onSearchChange(): void {
    this.searchText = this.searchInput.value;
    this.renderValueList();
  }

  /**
   * Handle "Select All" checkbox change
   */
  private onSelectAllChange(): void {
    if (this.selectAllCheckbox.checked) {
      // Select all values
      this.allValues.forEach(v => this.filterValues.add(this.normalizeValue(v)));
    } else {
      // Deselect all values
      this.filterValues.clear();
    }
    this.renderValueList();
  }

  /**
   * Handle individual value checkbox change
   */
  private onValueCheckboxChange(value: any, checked: boolean): void {
    if (checked) {
      this.filterValues.add(value);
    } else {
      this.filterValues.delete(value);
    }
    this.updateSelectAllState();
  }

  /**
   * Update the "Select All" checkbox state
   */
  private updateSelectAllState(): void {
    const allSelected = this.allValues.every(v => this.filterValues.has(this.normalizeValue(v)));
    const noneSelected = this.filterValues.size === 0;

    this.selectAllCheckbox.checked = allSelected;
    this.selectAllCheckbox.indeterminate = !allSelected && !noneSelected;
  }

  /**
   * Apply the filter
   */
  private applyFilter(): void {
    this.params.filterChangedCallback();
    if (this.hidePopup) {
      this.hidePopup();
    }
  }

  /**
   * Reset the filter to show all values
   */
  private resetFilter(): void {
    this.filterValues.clear();
    this.allValues.forEach(v => this.filterValues.add(this.normalizeValue(v)));
    this.searchText = '';
    this.searchInput.value = '';
    this.updateSelectAllState();
    this.renderValueList();
    this.params.filterChangedCallback();
    if (this.hidePopup) {
      this.hidePopup();
    }
  }

  /**
   * Returns the GUI element for the filter
   */
  getGui(): HTMLElement {
    return this.gui;
  }

  /**
   * Called for each row to check if it passes the filter
   */
  doesFilterPass(params: { data: any; node: any }): boolean {
    const value = this.params.getValue(params.node);
    const normalizedValue = this.normalizeValue(value);
    return this.filterValues.has(normalizedValue);
  }

  /**
   * Returns true if the filter is active (not showing all values)
   */
  isFilterActive(): boolean {
    // Filter is active if not all values are selected
    return this.filterValues.size < this.allValues.length;
  }

  /**
   * Returns the current filter model
   */
  getModel(): any {
    if (!this.isFilterActive()) {
      return null;
    }
    return {
      filterType: 'gtsSet',
      values: Array.from(this.filterValues)
    };
  }

  /**
   * Sets the filter model
   */
  setModel(model: any): void {
    if (model && model.values) {
      this.filterValues = new Set(model.values);
    } else {
      // No model = show all values
      this.filterValues.clear();
      this.allValues.forEach(v => this.filterValues.add(this.normalizeValue(v)));
    }
    this.updateSelectAllState();
    this.renderValueList();
  }

  /**
   * Called when the filter is destroyed
   */
  destroy(): void {
    // Cleanup if needed
  }

  /**
   * Called after the GUI is attached to the DOM
   */
  afterGuiAttached(params?: { hidePopup?: () => void }): void {
    this.hidePopup = params?.hidePopup;
    // Focus the search input when filter opens
    setTimeout(() => {
      this.searchInput.focus();
    }, 0);
  }

  /**
   * Refresh the filter values (called when data changes)
   */
  refresh(newParams: IFilterParams): boolean {
    // Re-extract unique values
    this.extractUniqueValues();

    // Remove any selected values that no longer exist
    const validValues = new Set(this.allValues.map(v => this.normalizeValue(v)));
    this.filterValues = new Set(
      Array.from(this.filterValues).filter(v => validValues.has(v))
    );

    this.renderValueList();
    this.updateSelectAllState();

    return true;
  }
}
