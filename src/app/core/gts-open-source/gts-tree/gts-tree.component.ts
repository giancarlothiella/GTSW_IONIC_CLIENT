import { Component, OnInit, OnDestroy, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonSpinner } from '@ionic/angular/standalone';
import { GtsDataService } from '../../services/gts-data.service';
import { GtsGridService } from '../gts-grid/gts-grid.service';
import { Subscription } from 'rxjs';
import { Tree } from 'primeng/tree';
import { TreeNode } from 'primeng/api';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-gts-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, IonSpinner, Tree, InputText],
  templateUrl: './gts-tree.component.html',
  styleUrls: ['./gts-tree.component.scss']
})
export class GtsTreeComponent implements OnInit, OnDestroy {

  private gtsDataService = inject(GtsDataService);
  private gtsGridService = inject(GtsGridService);
  private cdr = inject(ChangeDetectorRef);

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  // Subscriptions
  gridReloadListenerSubs: Subscription | undefined;
  gridRowUpdateListenerSubs: Subscription | undefined;
  gridSelectListenerSubs: Subscription | undefined;
  appViewListenerSubs: Subscription | undefined;

  // State
  metaData: any = {};
  pageData: any = {};
  treeReady: boolean = false;
  gridObject: any = { visible: true };

  // Tree configuration
  treeNodes: TreeNode[] = [];
  filteredNodes: TreeNode[] = [];
  selectedNode: TreeNode | null = null;
  filterText: string = '';

  // Tree metadata fields
  treeIdField: string = '';
  treeParentField: string = '';
  treeLabelFields: string[] = [];

  // Detail panel
  showDetail: boolean = true;
  selectedRowData: any = null;
  detailColumns: any[] = [];

  // Columns with showInTree flag
  iconColumns: any[] = [];

  // Flag to prevent action execution during programmatic selection
  isRestoringSelection: boolean = false;

  // Flag to lock row selection (gridLockRows/gridUnLockRows actions)
  rowsLocked: boolean = false;

  // Splitter
  treePanelWidth: number = 320;

  constructor() {}

  async ngOnInit() {

    // Grid reload listener — reuses same listener as grid
    this.gridReloadListenerSubs = this.gtsDataService
      .getGridReloadListener()
      .subscribe(async (data) => {
        const dataArray = data.split(';');
        const dataSetName = dataArray[0];

        if (this.metaData?.dataSetName === dataSetName) {
          // Handle editing mode flags (same protocol as gts-grid)
          if (dataArray.length > 1) {
            const allowFlags = dataArray[1].split(':');
            if (allowFlags[0] === 'Lock') {
              this.rowsLocked = allowFlags[1] === 'true';
              this.cdr.detectChanges();
              return;
            }
            if (['Edit', 'Insert', 'Delete', 'Select'].includes(allowFlags[0])) {
              return; // Tree doesn't support inline editing
            }
          }
          // Full reload
          this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
          await this.prepareTreeData();
          this.cdr.detectChanges();
        }
      });

    // Grid row update listener — handles dsRefreshSel (single row update)
    this.gridRowUpdateListenerSubs = this.gtsDataService
      .getGridRowUpdateListener()
      .subscribe(async (data: any) => {
        if (data?.dataSetName === this.metaData?.dataSetName) {
          // Rebuild tree with updated data
          this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
          await this.prepareTreeData();
          this.cdr.detectChanges();
        }
      });

    // Grid select listener — handles select/unselect from external actions
    this.gridSelectListenerSubs = this.gtsDataService
      .getGridSelectListener()
      .subscribe((data: any) => {
        if (data?.dataSetName === this.metaData?.dataSetName) {
          if (!data.isSelected) {
            // Unselect
            this.isRestoringSelection = true;
            this.selectedNode = null;
            this.selectedRowData = null;
            this.isRestoringSelection = false;
            this.cdr.detectChanges();
          } else if (this.treeIdField) {
            // Select — find and select the node matching selectedKeys
            const ds = this.gtsDataService.getDataSetAdapter(this.prjId, this.formId, this.metaData.dataSetName);
            if (ds?.data) {
              const dsData = ds.data.find((d: any) => d.dataSetName === this.metaData.dataSetName);
              if (dsData?.selectedKeys?.length > 0) {
                const keyField = Object.keys(dsData.selectedKeys[0])[0];
                const keyValue = dsData.selectedKeys[0][keyField];
                const found = this.findNodeById(this.filteredNodes, keyValue);
                if (found) {
                  this.isRestoringSelection = true;
                  this.selectedNode = found;
                  this.selectedRowData = found.data;
                  this.isRestoringSelection = false;
                  this.cdr.detectChanges();
                }
              }
            }
          }
        }
      });

    // View listener — tab visibility
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((data: any) => {
        // Handle visibility changes if needed
      });

    // Load metadata and data
    this.metaData = this.gtsDataService.getPageMetaData(
      this.prjId, this.formId, 'grids', this.objectName
    );
    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);

    if (this.metaData) {
      // Extract tree-specific metadata
      this.treeIdField = this.metaData.treeIdField || '';
      this.treeParentField = this.metaData.treeParentField || '';
      this.treeLabelFields = (this.metaData.treeLabelField || '')
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f);
      this.showDetail = this.metaData.treeShowDetail !== false;

      await this.prepareTreeData();
    }
  }

  ngOnDestroy() {
    this.gridReloadListenerSubs?.unsubscribe();
    this.gridRowUpdateListenerSubs?.unsubscribe();
    this.gridSelectListenerSubs?.unsubscribe();
    this.appViewListenerSubs?.unsubscribe();
  }

  /**
   * Prepare tree data from flat rows using treeIdField/treeParentField
   */
  async prepareTreeData(): Promise<void> {
    if (!this.metaData) return;

    // Get grid data using the same service as gts-grid
    const data: any = await this.gtsGridService.getGridData(
      this.prjId, this.formId, this.metaData, this.pageData, null
    );

    const gridObject = data.gridObject || {};
    this.gridObject = gridObject;

    // Get detail columns from metadata
    this.detailColumns = (this.metaData.columns || []).filter((col: any) => col.visible);

    // Get columns to show in tree nodes
    this.iconColumns = (this.metaData.columns || []).filter((col: any) => col.showInTree).map((col: any) => ({
      fieldName: col.dataField || col.fieldName,
      images: col.images || [],
      showLabel: col.colType === 'Images/Strings List',
      isImage: col.images && col.images.length > 0,
      caption: col.caption || col.text || col.dataField || col.fieldName
    }));

    // Get rows from gridObject.dataSet
    const rows = gridObject.dataSet || [];

    // Build tree from flat data
    this.treeNodes = this.buildTree(rows);
    this.filteredNodes = [...this.treeNodes];
    this.treeReady = true;

    // Restore or clear selection after reload
    if (this.selectedRowData && this.treeIdField) {
      const selectedId = this.selectedRowData[this.treeIdField];
      const found = this.findNodeById(this.filteredNodes, selectedId);
      if (found) {
        this.isRestoringSelection = true;
        this.selectedNode = found;
        this.selectedRowData = found.data;
        this.isRestoringSelection = false;
      } else {
        // Record no longer exists (deleted) — clear detail
        this.selectedNode = null;
        this.selectedRowData = null;
      }
    }
  }

  /**
   * Find a tree node by its ID field value (recursive)
   */
  private findNodeById(nodes: TreeNode[], id: any): TreeNode | null {
    for (const node of nodes) {
      if (node.data && node.data[this.treeIdField] === id) return node;
      if (node.children) {
        const found = this.findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Build PrimeNG TreeNode[] from flat rows using id/parent fields
   */
  buildTree(rows: any[]): TreeNode[] {
    if (!this.treeIdField || !this.treeParentField) {
      // No tree fields defined — return flat list
      return rows.map(row => this.rowToNode(row));
    }

    const nodeMap = new Map<any, TreeNode>();
    const roots: TreeNode[] = [];

    // First pass: create all nodes
    for (const row of rows) {
      const id = row[this.treeIdField];
      const node = this.rowToNode(row);
      nodeMap.set(id, node);
    }

    // Second pass: build parent-child relationships
    for (const row of rows) {
      const id = row[this.treeIdField];
      const parentId = row[this.treeParentField];
      const node = nodeMap.get(id)!;

      if (parentId === null || parentId === undefined || parentId === '' || !nodeMap.has(parentId)) {
        // Root node
        roots.push(node);
      } else {
        // Child node
        const parent = nodeMap.get(parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }
    }

    // Mark leaf nodes and expand all by default
    this.setExpandedAndLeaf(roots);

    return roots;
  }

  /**
   * Convert a data row to a PrimeNG TreeNode
   */
  private rowToNode(row: any): TreeNode {
    const label = this.treeLabelFields.length > 0
      ? this.treeLabelFields.map(f => row[f] || '').join(' ')
      : row[this.treeIdField] || '';

    // Get icon class from first image-type showInTree column
    let nodeIcon: string | undefined;
    let extraText = '';
    for (const ic of this.iconColumns) {
      if (ic.isImage && ic.images.length > 0) {
        const value = row[ic.fieldName];
        if (value !== null && value !== undefined) {
          const image = ic.images.find((img: any) => String(img.imgValue) === String(value));
          if (image) {
            nodeIcon = `gts-tree-icon-${image.stdImageId}`;
          }
        }
      } else if (!ic.isImage) {
        // Text column — append to label
        const value = row[ic.fieldName];
        if (value !== null && value !== undefined && value !== '') {
          // Format dates
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            const d = new Date(value);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            extraText += ` [${dd}/${mm}/${yyyy}]`;
          } else {
            extraText += ` [${value}]`;
          }
        }
      }
    }

    return {
      label: label.trim() + extraText,
      data: row,
      expanded: true,
      children: [],
      leaf: false,
      icon: nodeIcon
    };
  }

  /**
   * Recursively set leaf/expanded properties
   */
  private setExpandedAndLeaf(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (!node.children || node.children.length === 0) {
        node.leaf = true;
        node.children = undefined;
      } else {
        node.expanded = true;
        this.setExpandedAndLeaf(node.children);
      }
    }
  }

  /**
   * Handle node selection
   */
  onNodeSelect(event: any): void {
    if (this.isRestoringSelection) return;

    // Block selection when rows are locked
    if (this.rowsLocked) {
      // Restore previous selection
      if (this.selectedRowData && this.treeIdField) {
        const prevId = this.selectedRowData[this.treeIdField];
        const prevNode = this.findNodeById(this.filteredNodes, prevId);
        if (prevNode) {
          this.isRestoringSelection = true;
          this.selectedNode = prevNode;
          this.isRestoringSelection = false;
        }
      }
      return;
    }

    const node = event.node;
    if (!node?.data) return;

    this.selectedRowData = node.data;

    // Notify GtsDataService about the selection (same pattern as grid)
    const dataSetName = this.metaData?.dataSetName;
    const dataAdapter = this.metaData?.dataAdapter || '';
    if (dataSetName) {
      // Extract keys
      const sqlKeys = this.gridObject?.sqlKeys || this.metaData?.sqlKeys;
      if (sqlKeys && Array.isArray(sqlKeys)) {
        const keys = sqlKeys.map((k: any) => k.keyField || k.fieldName);
        const selectedKeys = keys.map((key: string) => node.data[key]);

        // Update pageData selection and execute action (same as grid does)
        this.gtsGridService.setGridObjectSelectedData(
          this.prjId, this.formId, dataAdapter, dataSetName,
          [node.data], selectedKeys,
          this.metaData.actionOnSelectedRows || '',
          this.gridObject
        );
      }
    }
  }

  /**
   * Handle splitter drag to resize tree panel
   */
  onSplitterMouseDown(event: MouseEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.treePanelWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      this.treePanelWidth = Math.max(150, startWidth + delta);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Handle node double-click
   */
  onNodeDblClick(event: any): void {
    if (this.metaData?.actionOnDoubleClickedRow) {
      this.gtsDataService.runAction(
        this.prjId,
        this.formId,
        this.metaData.actionOnDoubleClickedRow
      );
    }
  }

  /**
   * Handle node unselection
   */
  onNodeUnselect(event: any): void {
    if (this.isRestoringSelection) return;
    // Prevent deselection — re-select the same node
    this.selectedNode = event.node;
  }

  /**
   * Filter tree nodes by text
   */
  onFilter(): void {
    if (!this.filterText || this.filterText.trim() === '') {
      this.filteredNodes = [...this.treeNodes];
      return;
    }

    const term = this.filterText.toLowerCase();
    this.filteredNodes = this.filterTreeNodes(this.treeNodes, term);
  }

  /**
   * Recursively filter tree nodes — keeps parents of matching children
   */
  private filterTreeNodes(nodes: TreeNode[], term: string): TreeNode[] {
    const result: TreeNode[] = [];

    for (const node of nodes) {
      const labelMatch = node.label?.toLowerCase().includes(term);
      let filteredChildren: TreeNode[] = [];

      if (node.children && node.children.length > 0) {
        filteredChildren = this.filterTreeNodes(node.children, term);
      }

      if (labelMatch || filteredChildren.length > 0) {
        result.push({
          ...node,
          expanded: true,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
          leaf: filteredChildren.length === 0 && (!node.children || node.children.length === 0)
        });
      }
    }

    return result;
  }

  /**
   * Get display value for a column in the detail panel
   */
  getDetailValue(col: any): string {
    if (!this.selectedRowData) return '';
    const fieldName = col.fieldName || col.dataField;
    const value = this.selectedRowData[fieldName];
    if (value === null || value === undefined) return '';

    // Format dates
    if (col.colType === 'Date' || col.colType === 'DateTime') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        if (col.colType === 'DateTime') {
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
        }
        return `${dd}/${mm}/${yyyy}`;
      }
    }

    return String(value);
  }

  /**
   * Get icon image source for a tree node based on column images mapping
   */
  getNodeIcon(node: any, ic: any): string {
    if (!node?.data || !ic.isImage) return '';
    const value = node.data[ic.fieldName];
    if (value === null || value === undefined) return '';
    const image = ic.images.find((img: any) => String(img.imgValue) === String(value));
    if (image) {
      return `/assets/icons/stdImage_${image.stdImageId}.png`;
    }
    return '';
  }

  /**
   * Get icon label text for Images/Strings List columns
   */
  getNodeIconLabel(node: any, ic: any): string {
    if (!node?.data) return '';
    const value = node.data[ic.fieldName];
    if (value === null || value === undefined) return '';
    if (ic.isImage) {
      const image = ic.images.find((img: any) => String(img.imgValue) === String(value));
      return image?.imgText || '';
    }
    return String(value);
  }

  /**
   * Get text value for non-image showInTree columns
   */
  getNodeText(node: any, ic: any): string {
    if (!node?.data) return '';
    const value = node.data[ic.fieldName];
    if (value === null || value === undefined) return '';
    return String(value);
  }

  /**
   * Get column header text
   */
  getColumnHeader(col: any): string {
    return col.text || col.caption || col.fieldName || '';
  }
}
