/**
 * Module initialization tests for CoverageAnalyzer
 *
 * This test verifies that the module can be loaded BEFORE the Google Maps API
 * is available. This catches bugs where google.maps types/objects are referenced
 * at module scope rather than lazily within functions.
 *
 * IMPORTANT: This test file runs in isolation and should NOT set up google mocks
 * before importing, to simulate the real browser environment.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
describe('CoverageAnalyzer module initialization', () => {
    test('module can be imported before Google Maps API is loaded', async () => {
        // Explicitly ensure google is undefined, simulating browser before Maps loads
        const hasGoogle = 'google' in global;
        const originalGoogle = hasGoogle ? global.google : undefined;
        // Remove google from global scope
        if (hasGoogle) {
            delete global.google;
        }
        delete globalThis.google;
        // Mock minimal browser environment (document is needed for module to load)
        global.document = {
            readyState: 'complete',
            getElementById: () => null,
            addEventListener: () => { },
        };
        global.window = {
            location: { pathname: '/other-page' }, // Not the coverage page
        };
        try {
            // This should NOT throw "ReferenceError: google is not defined"
            // If it does, it means we're referencing google.maps at module scope
            const { CoverageAnalyzer } = await import('./coverage-analyzer.js');
            // Verify we can instantiate the class without google being defined
            assert.ok(CoverageAnalyzer, 'CoverageAnalyzer class should be exported');
            // Note: We don't instantiate because that might trigger other DOM dependencies
            // The key test is that the import itself doesn't throw
        }
        catch (error) {
            if (error instanceof ReferenceError && error.message.includes('google')) {
                assert.fail('Module references google.maps at module scope. ' +
                    'Use lazy initialization (functions) instead of module-level constants.');
            }
            // Re-throw other errors
            throw error;
        }
        finally {
            // Restore original state
            if (hasGoogle && originalGoogle !== undefined) {
                global.google = originalGoogle;
                globalThis.google = originalGoogle;
            }
        }
    });
    test('module-level constants do not reference google.maps', async () => {
        // Delete google if it exists
        delete global.google;
        delete globalThis.google;
        // Mock minimal DOM to allow module load
        global.document = {
            readyState: 'complete',
            getElementById: () => null,
            addEventListener: () => { },
        };
        global.window = {
            location: { pathname: '/test' },
        };
        // Clear module cache to force re-import
        const modulePath = './coverage-analyzer.js';
        const resolvedPath = await import.meta.resolve(modulePath);
        // Attempt import - should succeed without google
        await assert.doesNotReject(() => import(resolvedPath + '?t=' + Date.now()), ReferenceError, 'Module constants should not reference google.maps at load time');
    });
});
//# sourceMappingURL=module-initialization.test.js.map