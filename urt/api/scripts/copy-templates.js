import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const srcDir = path.join(rootDir, 'src', 'lib', 'mail', 'templates');
const destDir = path.join(rootDir, 'dist', 'lib', 'mail', 'templates');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('✅ Email templates successfully copied to dist/lib/mail/templates');
} else {
  console.warn('⚠️ Template source directory not found:', srcDir);
}
