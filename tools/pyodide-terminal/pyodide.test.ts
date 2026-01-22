import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// When compiled to dist/, we need to reference the source file in tools/
const sourceDir = __dirname.includes('/dist/')
  ? __dirname.replace('/dist/', '/')
  : __dirname;

test('Pyodide Terminal structure', async (t) => {
  const indexPath = path.join(sourceDir, 'index.md');
  const content = fs.readFileSync(indexPath, 'utf8');

  await t.test('should contain local Pyodide script', () => {
    // Matches both direct paths and paths using cacheBust filter
    assert.match(content, /['"]\.\.\/\.\.\/assets\/libs\/pyodide\/pyodide\.js['"]/);
  });

  await t.test('should contain local xterm script', () => {
    assert.match(content, /['"]\.\.\/\.\.\/assets\/libs\/xterm\/xterm\.js['"]/);
  });

  await t.test('should contain local xterm-addon-fit script', () => {
    assert.match(content, /['"]\.\.\/\.\.\/assets\/libs\/xterm\/xterm-addon-fit\.js['"]/);
  });

  await t.test('should contain terminal container', () => {
    assert.match(content, /id="terminal-container"/);
  });

  await t.test('should have loading overlay', () => {
     assert.match(content, /id="loading"/);
  });

  await t.test('embedded JavaScript should have valid syntax', () => {
    // Extract content between <script> and </script> tags (excluding src attributes)
    const scriptMatches = content.match(/<script>\s*([\s\S]*?)\s*<\/script>/g);
    assert.ok(scriptMatches && scriptMatches.length > 0, 'No embedded script found');

    for (const scriptTag of scriptMatches) {
      const code = scriptTag.replace(/<script>|<\/script>/g, '');
      try {
        new vm.Script(code);
      } catch (e) {
        assert.fail(`Syntax error in embedded script: ${(e as Error).message}`);
      }
    }
  });
});
