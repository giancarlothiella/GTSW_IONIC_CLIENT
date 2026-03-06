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

  // Flag to prevent action execution during programmatic selection
  isRestoringSelection: boolean = false;

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
            if (['Edit', 'Insert', 'Delete', 'Lock', 'Select'].includes(allowFlags[0])) {
              return; // Tree doesn't support inline editing yet
            }
          }
          // Full reload
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
          if (data.action === 'unselect') {
            this.isRestoringSelection = true;
            this.selectedNode = null;
            this.selectedRowData = null;
            this.isRestoringSelection = false;
            this.cdr.detectChanges();
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

    // Get rows from gridObject.dataSet
    const rows = gridObject.dataSet || [];

    // Build tree from flat data
    this.treeNodes = this.buildTree(rows);
    this.filteredNodes = [...this.treeNodes];
    this.treeReady = true;
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

    return {
      label: label.trim(),
      data: row,
      expanded: true,
      children: [],
      leaf: false
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
   * Get column header text
   */
  getColumnHeader(col: any): string {
    return col.text || col.caption || col.fieldName || '';
  }
}
