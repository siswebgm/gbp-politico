const fs = require('fs');
const path = 'c:\\Users\\jmend\\sistema-vereador\\gbp-main\\src\\components\\Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "top: 'calc(4rem + var(--safe-area-inset-top))',",
  "top: 'calc(4rem + env(safe-area-inset-top, 0px))',"
);

content = content.replace(
  "height: 'calc(100vh - (4rem + var(--safe-area-inset-top)))',",
  "height: 'calc(100vh - 4rem - env(safe-area-inset-top, 0px))',"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
