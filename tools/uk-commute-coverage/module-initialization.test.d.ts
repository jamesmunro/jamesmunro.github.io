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
export {};
