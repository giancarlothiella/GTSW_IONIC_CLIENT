import { IFloatingFilterComp, IFloatingFilterParams } from 'ag-grid-community';

/**
 * GTS Set Floating Filter Component
 *
 * Custom floating filter that works with GtsSetFilterComponent.
 * Provides a text input for quick filtering that works alongside the
 * dropdown checkbox filter.
 *
 * Features:
 * - Text input for quick "contains" search
 * - Works in conjunction with the Set Filter checkboxes
 * - Real-time filtering as you type
 */
export class GtsSetFloatingFilterComponent implements IFloatingFilterComp {
  private params!: IFloatingFilterParams;
  private gui!: HTMLElement;
  private inputElement!: HTMLInputElement;
  private currentValue: string = '';

  init(params: IFloatingFilterParams): void {
    this.params = params;
    this.createGui();
  }

  /**
   * Create the floating filter GUI
   */
  private createGui(): void {
    this.gui = document.createElement('div');
    this.gui.className = 'gts-floating-filter-wrapper';
    // Let CSS handle the layout - don't set width: 100% to allow button space

    // Create input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Filter...';
    this.inputElement.className = 'gts-floating-filter-input';
    // Let CSS handle sizing

    // Focus styling
    this.inputElement.addEventListener('focus', () => {
      this.inputElement.style.borderColor = '#3880ff';
    });
    this.inputElement.addEventListener('blur', () => {
      this.inputElement.style.borderColor = '#ddd';
    });

    // Handle input changes
    this.inputElement.addEventListener('input', () => {
      this.onInputChange();
    });

    // Handle Enter key to apply filter
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.onInputChange();
      }
    });

    this.gui.appendChild(this.inputElement);
  }

  /**
   * Handle input value change
   */
  private onInputChange(): void {
    this.currentValue = this.inputElement.value;

    // Get the parent filter instance and update its text filter
    // AG Grid v35+ uses callback pattern for parentFilterInstance
    // Use 'any' type to avoid strict type checking since our custom filter has additional methods
    this.params.parentFilterInstance((parentFilter: any) => {
      if (parentFilter && typeof parentFilter.setFloatingFilterText === 'function') {
        parentFilter.setFloatingFilterText(this.currentValue);
      }
    });
  }

  /**
   * Returns the GUI element
   */
  getGui(): HTMLElement {
    return this.gui;
  }

  /**
   * Called when the parent filter model changes
   */
  onParentModelChanged(parentModel: any): void {
    // If the parent filter is cleared, clear the input
    if (!parentModel) {
      this.inputElement.value = '';
      this.currentValue = '';
    } else if (parentModel.floatingFilterText !== undefined) {
      // Sync the floating filter text with parent
      this.inputElement.value = parentModel.floatingFilterText || '';
      this.currentValue = parentModel.floatingFilterText || '';
    }
  }

  /**
   * Called when the floating filter is destroyed
   */
  destroy(): void {
    // Cleanup if needed
  }

  /**
   * Refresh the floating filter (called when data changes)
   */
  refresh(params: IFloatingFilterParams): boolean {
    return true;
  }
}
