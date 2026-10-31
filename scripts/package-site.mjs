import { copyFileSync, cpSync, existsSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const output = join(root, '.site');
const publicFiles = [
  'index.html', 'database.html', 'header.html', 'footer.html', 'classes.html', 'classes.js',
  'charmaking.html', 'charmaking.js', 'src.js', 'style.css', 'theme.css',
  'data/arts.txt', 'data/focus.txt', 'data/spells.txt',
];
const generatedPages = [
  'arts.html', 'backgrounds.html', 'equipment.html', 'focus.html', 'reference.html', 'spells.html',
];
const builder = join(root, 'character-builder', 'frontend', 'dist');

// Rebuild only the disposable preview directory, including when an asset was renamed.
if (existsSync(output)) {
  if (realpathSync(output) !== output) throw Error('Expected .site to be a local build directory');
  rmSync(output, { recursive: true });
}
mkdirSync(join(output, 'data'), { recursive: true });
for (const name of publicFiles) {
  copyFileSync(join(root, 'database', 'public', name), join(output, name));
}
for (const name of generatedPages) {
  copyFileSync(join(root, 'database', 'generated', name), join(output, name));
}
cpSync(builder, join(output, 'character'), { recursive: true });
copyFileSync(join(builder, 'favicon.svg'), join(output, 'favicon.svg'));
if (existsSync(join(root, 'CNAME'))) copyFileSync(join(root, 'CNAME'), join(output, 'CNAME'));
console.log('Packaged public website in .site/');
