const fs = require('fs');
const path = 'c:\\Users\\jmend\\sistema-vereador\\gbp-main\\src\\components\\Layout.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "style={{ paddingTop: 'var(--safe-area-inset-top)' }}",
  "style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}"
);

content = content.replace(
  "className=\"flex flex-1 h-[calc(100vh-4rem)]\" style={{ paddingTop: 'calc(4rem + var(--safe-area-inset-top))' }}",
  "className=\"flex flex-1\" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))', height: 'calc(100vh - 4rem - env(safe-area-inset-top, 0px))' }}"
);

content = content.replace(
  "style={{ overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'var(--safe-area-inset-bottom)' }}",
  "style={{ overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
