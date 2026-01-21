#!/bin/bash
# Script to migrate old GTS imports to gts-open-source

files=(
  "src/app/features/DCW/bilancio/bilancio.page.ts"
  "src/app/features/DCW/salesDashboard/salesDashboard.page.ts"
  "src/app/features/DCW/schede-contabili/schede-contabili.page.ts"
  "src/app/features/GTR/fatture/fatture.page.ts"
  "src/app/features/GTR/sitPagamenti/sitPagamenti.page.ts"
  "src/app/features/GTR/stagioni/stagioni.page.ts"
  "src/app/features/GTR/std-table/std-table.page.ts"
  "src/app/features/GTR/web-app/web-app.page.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    sed -i "s|from '../../../core/gts/gts-toolbar/gts-toolbar.component'|from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component'|g" "$file"
    sed -i "s|from '../../../core/gts/gts-tabs/gts-tabs.component'|from '../../../core/gts-open-source/gts-tabs/gts-tabs.component'|g" "$file"
    sed -i "s|from '../../../core/gts/gts-grid/gts-grid.component'|from '../../../core/gts-open-source/gts-grid/gts-grid.component'|g" "$file"
    sed -i "s|from '../../../core/gts/gts-form/gts-form.component'|from '../../../core/gts-open-source/gts-form/gts-form.component'|g" "$file"
    sed -i "s|from '../../../core/gts/gts-form-popup/gts-form-popup.component'|from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component'|g" "$file"
    sed -i "s|from '../../../core/gts/gts-message/gts-message.component'|from '../../../core/gts-open-source/gts-message/gts-message.component'|g" "$file"
    sed -i "s|from '../../../core/gts/gts-loader/gts-loader.component'|from '../../../core/gts-open-source/gts-loader/gts-loader.component'|g" "$file"
    sed -i "s|from '../../../core/gts/gts-reports/gts-reports.component'|from '../../../core/gts-open-source/gts-reports/gts-reports.component'|g" "$file"
  fi
done

echo "Migration complete!"
