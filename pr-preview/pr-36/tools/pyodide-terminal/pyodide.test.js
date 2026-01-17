const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Pyodide Terminal structure', async (t) => {
  const indexPath = path.join(__dirname, 'index.md');
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
        assert.fail(`Syntax error in embedded script: ${e.message}`);
      }
    }
  });
});
