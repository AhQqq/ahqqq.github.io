import { mkdirSync, copyFileSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.site');
mkdirSync(output, { recursive: true });
for (const file of ['theme.css','favicon.svg','index.html','database.html','header.html','footer.html','reference.html','spells.html','focus.html','arts.html','backgrounds.html','equipment.html','classes.html','classes.js','charmaking.html','charmaking.js','src.js','style.css']) {
  copyFileSync(resolve(root,file), resolve(output,file));
}
for (const dir of ['character','data']) cpSync(resolve(root,dir),resolve(output,dir),{recursive:true});
if (existsSync(resolve(root,'CNAME'))) copyFileSync(resolve(root,'CNAME'),resolve(output,'CNAME'));
console.log('Packaged public website in .site/');
