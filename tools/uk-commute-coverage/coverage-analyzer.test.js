/**
 * Unit tests for CoverageAnalyzer
 * Tests the pure functions that don't require DOM/network
 */

const { describe, test } = require('node:test');
const assert = require('node:assert');

// Extract validatePostcode for testing by creating a test instance
// Since CoverageAnalyzer is browser-dependent, we extract the regex pattern
const POSTCODE_PATTERN = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;

function validatePostcode(postcode) {
  if (!POSTCODE_PATTERN.test(postcode)) {
    const hasSpace = postcode.includes(' ');
    const suggestion = hasSpace ? '' : ' (missing space?)';
    throw new Error(`Invalid postcode format: ${postcode}${suggestion}`);
  }
}

describe('CoverageAnalyzer', () => {
  describe('validatePostcode', () => {
    test('accepts valid postcodes with space', () => {
      const validPostcodes = [
        'SW1A 1AA', // Westminster
        'EC1A 1BB', // City of London
        'W1A 0AX',  // BBC
        'M1 1AE',   // Manchester
        'B33 8TH',  // Birmingham
        'CR2 6XH',  // Croydon
        'DN55 1PT', // Doncaster
        'EH1 1YZ',  // Edinburgh
      ];

      validPostcodes.forEach(postcode => {
        assert.doesNotThrow(() => validatePostcode(postcode), `${postcode} should be valid`);
      });
    });

    test('accepts valid postcodes without space', () => {
      const validPostcodes = [
        'SW1A1AA',
        'EC1A1BB',
        'W1A0AX',
        'M11AE',
        'B338TH',
      ];

      validPostcodes.forEach(postcode => {
        assert.doesNotThrow(() => validatePostcode(postcode), `${postcode} should be valid`);
      });
    });

    test('accepts lowercase postcodes', () => {
      assert.doesNotThrow(() => validatePostcode('sw1a 1aa'));
      assert.doesNotThrow(() => validatePostcode('sw1a1aa'));
    });

    test('rejects invalid postcodes', () => {
      const invalidPostcodes = [
        '123456',     // All numbers
        'ABCDEF',     // All letters
        'SW1',        // Too short
        'SW1A 1A',    // Missing final letter
        'SW1A 1AAA',  // Too many letters at end
        '1SW1A 1AA',  // Starts with number
        '',           // Empty
        'SWIA IAA',   // I instead of 1 (common mistake)
      ];

      invalidPostcodes.forEach(postcode => {
        assert.throws(
          () => validatePostcode(postcode),
          /Invalid postcode format/,
          `${postcode} should be invalid`
        );
      });
    });

    test('suggests missing space for spaceless invalid postcodes', () => {
      try {
        validatePostcode('INVALID');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error.message.includes('(missing space?)'),
          'Should suggest missing space for spaceless invalid postcodes');
      }
    });

    test('does not suggest missing space when space is present', () => {
      try {
        validatePostcode('INV ALID');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(!error.message.includes('(missing space?)'),
          'Should not suggest missing space when space is present');
      }
    });

    test('includes the invalid postcode in error message', () => {
      const testPostcode = 'BADCODE';
      try {
        validatePostcode(testPostcode);
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error.message.includes(testPostcode),
          'Error message should include the invalid postcode');
      }
    });
  });
});
