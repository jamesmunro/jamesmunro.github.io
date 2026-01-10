const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Pyodide Terminal structure', async (t) => {
  const indexPath = path.join(__dirname, 'index.md');
  const content = fs.readFileSync(indexPath, 'utf8');

  await t.test('should contain Pyodide CDN script', () => {
    assert.match(content, /src="https:\/\/cdn\.jsdelivr\.net\/pyodide\/v0\.25\.0\/full\/pyodide\.js"/);
  });

  await t.test('should contain local xterm script', () => {
    assert.match(content, /src="\.\.\/\.\.\/assets\/libs\/xterm\/xterm\.js"/);
  });

  await t.test('should contain local xterm-addon-fit script', () => {
    assert.match(content, /src="\.\.\/\.\.\/assets\/libs\/xterm\/xterm-addon-fit\.js"/);
  });

  await t.test('should contain terminal container', () => {
    assert.match(content, /id="terminal-container"/);
  });
  
  await t.test('should have loading overlay', () => {
     assert.match(content, /id="loading"/);
  });
});