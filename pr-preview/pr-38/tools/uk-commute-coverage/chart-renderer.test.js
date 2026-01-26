/**
 * Unit tests for ChartRenderer
 * Tests pure functions without DOM dependencies
 */
import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
// Setup minimal DOM environment for ChartRenderer
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
const { ChartRenderer } = await import('./chart-renderer.js');
describe('ChartRenderer', () => {
    let renderer;
    before(() => {
        renderer = new ChartRenderer('test-container');
    });
    describe('getSignalLevel', () => {
        test('returns 0 for null/undefined network data', () => {
            assert.strictEqual(renderer.getSignalLevel(null), 0);
            assert.strictEqual(renderer.getSignalLevel(undefined), 0);
        });
        test('returns 0 for network data with error', () => {
            const networkData = { error: 'Some error', level: null };
            assert.strictEqual(renderer.getSignalLevel(networkData), 0);
        });
        test('returns the level when valid', () => {
            assert.strictEqual(renderer.getSignalLevel({ level: 0 }), 0);
            assert.strictEqual(renderer.getSignalLevel({ level: 1 }), 1);
            assert.strictEqual(renderer.getSignalLevel({ level: 2 }), 2);
            assert.strictEqual(renderer.getSignalLevel({ level: 3 }), 3);
            assert.strictEqual(renderer.getSignalLevel({ level: 4 }), 4);
        });
        test('clamps level to 0-4 range', () => {
            assert.strictEqual(renderer.getSignalLevel({ level: -1 }), 0, 'Should clamp negative to 0');
            assert.strictEqual(renderer.getSignalLevel({ level: 5 }), 4, 'Should clamp >4 to 4');
            assert.strictEqual(renderer.getSignalLevel({ level: 100 }), 4, 'Should clamp large values to 4');
        });
        test('returns 0 for non-numeric level', () => {
            assert.strictEqual(renderer.getSignalLevel({ level: 'good' }), 0);
            assert.strictEqual(renderer.getSignalLevel({ level: null }), 0);
            assert.strictEqual(renderer.getSignalLevel({}), 0);
        });
    });
    describe('calculateSummary', () => {
        test('calculates correct cumulative percentages for uniform coverage', () => {
            // All points have level 4 for all networks
            const coverageResults = Array(10).fill(null).map(() => ({
                point: { distance: 0, lat: 0, lng: 0 },
                coverage: {
                    latitude: 0,
                    longitude: 0,
                    networks: {
                        EE: { level: 4 },
                        Vodafone: { level: 4 },
                        O2: { level: 4 },
                        Three: { level: 4 }
                    }
                }
            }));
            const summary = renderer.calculateSummary(coverageResults);
            // All cumulative columns should be 100% since all points are level 4
            assert.strictEqual(summary.EE['Indoor+'], 100, 'Level ≥4');
            assert.strictEqual(summary.EE['Indoor'], 100, 'Level ≥3');
            assert.strictEqual(summary.EE['Outdoor'], 100, 'Level ≥2');
            assert.strictEqual(summary.EE['Variable'], 100, 'Level ≥1');
            assert.strictEqual(summary.EE['Poor/None'], 0, 'Level =0');
            assert.strictEqual(summary.EE.avgLevel, 4);
        });
        test('calculates correct cumulative percentages for mixed coverage', () => {
            // 5 points with level 4, 5 points with level 0
            const coverageResults = [
                ...Array(5).fill(null).map(() => ({
                    point: { distance: 0, lat: 0, lng: 0 },
                    coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 }, Vodafone: { level: 4 }, O2: { level: 4 }, Three: { level: 4 } } }
                })),
                ...Array(5).fill(null).map(() => ({
                    point: { distance: 0, lat: 0, lng: 0 },
                    coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 }, Vodafone: { level: 0 }, O2: { level: 0 }, Three: { level: 0 } } }
                }))
            ];
            const summary = renderer.calculateSummary(coverageResults);
            // 5 of 10 points are level 4, so cumulative percentages reflect this
            assert.strictEqual(summary.EE['Indoor+'], 50, '5/10 points are ≥4');
            assert.strictEqual(summary.EE['Indoor'], 50, '5/10 points are ≥3');
            assert.strictEqual(summary.EE['Outdoor'], 50, '5/10 points are ≥2');
            assert.strictEqual(summary.EE['Variable'], 50, '5/10 points are ≥1');
            assert.strictEqual(summary.EE['Poor/None'], 50, '5/10 points are =0');
            assert.strictEqual(summary.EE.avgLevel, 2);
        });
        test('handles missing network data gracefully', () => {
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: {} } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: null },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } }
            ];
            const summary = renderer.calculateSummary(coverageResults);
            // Should not throw and should calculate based on available data
            assert.ok(summary.EE, 'Should have EE summary');
            assert.ok(typeof summary.EE.avgLevel === 'number', 'avgLevel should be a number');
        });
        test('handles empty results', () => {
            const summary = renderer.calculateSummary([]);
            assert.strictEqual(summary.EE['Indoor+'], 0);
            assert.strictEqual(summary.EE['Outdoor'], 0);
            assert.strictEqual(summary.EE.avgLevel, 0);
        });
        test('correctly calculates cumulative "or better" percentages', () => {
            // Each level appears once: 4, 3, 2, 1, 0
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 3 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 1 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 } } } },
            ];
            const summary = renderer.calculateSummary(coverageResults);
            // Cumulative "or better" percentages:
            assert.strictEqual(summary.EE['Indoor+'], 20, '1/5 points are ≥4 (level 4)');
            assert.strictEqual(summary.EE['Indoor'], 40, '2/5 points are ≥3 (levels 4,3)');
            assert.strictEqual(summary.EE['Outdoor'], 60, '3/5 points are ≥2 (levels 4,3,2)');
            assert.strictEqual(summary.EE['Variable'], 80, '4/5 points are ≥1 (levels 4,3,2,1)');
            assert.strictEqual(summary.EE['Poor/None'], 20, '1/5 points are =0');
        });
        test('calculates average level correctly', () => {
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 1 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 3 } } } },
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
            ];
            const summary = renderer.calculateSummary(coverageResults);
            assert.strictEqual(summary.EE.avgLevel, 2, 'Average of 0,1,2,3,4 should be 2');
        });
    });
    describe('groupIntoSegments', () => {
        test('returns empty array for empty results', () => {
            const segments = renderer.groupIntoSegments([], 'EE');
            assert.strictEqual(segments.length, 0);
        });
        test('creates single segment for uniform coverage', () => {
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 5000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 10000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } }
            ];
            const segments = renderer.groupIntoSegments(coverageResults, 'EE');
            assert.strictEqual(segments.length, 1, 'Should create single segment');
            assert.strictEqual(segments[0].level, 4);
            assert.strictEqual(segments[0].startDistance, 0);
            assert.strictEqual(segments[0].endDistance, 10, '10000m = 10km');
            assert.strictEqual(segments[0].widthPercent, 100);
        });
        test('groups consecutive points with same coverage level', () => {
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 2500, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 5000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
                { point: { distance: 7500, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
                { point: { distance: 10000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } }
            ];
            const segments = renderer.groupIntoSegments(coverageResults, 'EE');
            assert.strictEqual(segments.length, 2, 'Should create 2 segments');
            assert.strictEqual(segments[0].level, 4);
            assert.strictEqual(segments[0].startDistance, 0);
            assert.strictEqual(segments[0].endDistance, 5, '5000m = 5km');
            assert.strictEqual(segments[0].widthPercent, 50);
            assert.strictEqual(segments[1].level, 2);
            assert.strictEqual(segments[1].startDistance, 5);
            assert.strictEqual(segments[1].endDistance, 10);
            assert.strictEqual(segments[1].widthPercent, 50);
        });
        test('handles multiple level changes', () => {
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 2000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 3 } } } },
                { point: { distance: 4000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
                { point: { distance: 6000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 1 } } } },
                { point: { distance: 8000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 } } } },
                { point: { distance: 10000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 } } } }
            ];
            const segments = renderer.groupIntoSegments(coverageResults, 'EE');
            assert.strictEqual(segments.length, 5, 'Should create 5 segments for 5 different levels');
            assert.strictEqual(segments[0].level, 4);
            assert.strictEqual(segments[1].level, 3);
            assert.strictEqual(segments[2].level, 2);
            assert.strictEqual(segments[3].level, 1);
            assert.strictEqual(segments[4].level, 0);
        });
        test('collects postcodes within segments', () => {
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, postcode: 'SW1A 1AA', coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 2500, lat: 0, lng: 0 }, postcode: 'SW1A 2AA', coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 5000, lat: 0, lng: 0 }, postcode: 'EC2N 2DB', coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
                { point: { distance: 7500, lat: 0, lng: 0 }, postcode: 'EC2N 3AA', coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
                { point: { distance: 10000, lat: 0, lng: 0 }, postcode: 'EC2N 3AA', coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } }
            ];
            const segments = renderer.groupIntoSegments(coverageResults, 'EE');
            assert.strictEqual(segments[0].postcodes.length, 2, 'First segment should have 2 unique postcodes');
            assert.ok(segments[0].postcodes.includes('SW1A 1AA'));
            assert.ok(segments[0].postcodes.includes('SW1A 2AA'));
            assert.strictEqual(segments[1].postcodes.length, 2, 'Second segment should have 2 unique postcodes (deduped)');
            assert.ok(segments[1].postcodes.includes('EC2N 2DB'));
            assert.ok(segments[1].postcodes.includes('EC2N 3AA'));
        });
        test('calculates width percentages correctly', () => {
            const coverageResults = [
                { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
                { point: { distance: 2500, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 3 } } } },
                { point: { distance: 10000, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 3 } } } }
            ];
            const segments = renderer.groupIntoSegments(coverageResults, 'EE');
            assert.strictEqual(segments.length, 2);
            assert.strictEqual(segments[0].widthPercent, 25, 'First segment 0-2.5km = 25% of 10km');
            assert.strictEqual(segments[1].widthPercent, 75, 'Second segment 2.5-10km = 75% of 10km');
        });
    });
});
//# sourceMappingURL=chart-renderer.test.js.map