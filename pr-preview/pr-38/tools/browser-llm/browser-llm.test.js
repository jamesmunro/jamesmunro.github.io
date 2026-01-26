import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// When compiled to dist/, we need to reference the source file in tools/
const sourceDir = __dirname.includes('/dist/')
    ? __dirname.replace('/dist/', '/')
    : __dirname;
describe('Browser LLM structure', () => {
    const indexPath = join(sourceDir, 'index.md');
    const indexContent = readFileSync(indexPath, 'utf-8');
    it('should import from browser-llm.js', () => {
        assert.ok(indexContent.includes('./browser-llm.js'), 'index.md should import from ./browser-llm.js');
    });
    it('should have model selection UI elements', () => {
        assert.ok(indexContent.includes('id="model-selection"'), 'should have model selection dropdown');
        assert.ok(indexContent.includes('id="download"'), 'should have download button');
    });
    it('should have chat UI elements', () => {
        assert.ok(indexContent.includes('id="chat-box"'), 'should have chat box');
        assert.ok(indexContent.includes('id="user-input"'), 'should have user input textarea');
        assert.ok(indexContent.includes('id="send"'), 'should have send button');
    });
    it('should have status elements', () => {
        assert.ok(indexContent.includes('id="download-status"'), 'should have download status');
        assert.ok(indexContent.includes('id="chat-stats"'), 'should have chat stats');
    });
    it('should mention WebGPU in notes', () => {
        assert.ok(indexContent.toLowerCase().includes('webgpu'), 'should mention WebGPU requirement');
    });
});
//# sourceMappingURL=browser-llm.test.js.map