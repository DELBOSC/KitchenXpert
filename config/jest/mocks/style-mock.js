/**
 * Style Mock for Jest Tests
 *
 * Purpose:
 * - Mocks CSS/SCSS/LESS file imports in tests
 * - Prevents Jest from trying to parse stylesheets
 * - Returns empty object for CSS Modules compatibility
 *
 * Usage:
 * - Automatically applied via Jest's moduleNameMapper configuration
 * - Handles CSS, SCSS, SASS, LESS files
 * - Works with CSS Modules (className references)
 *
 * Jest Configuration (jest.config.js):
 * moduleNameMapper: {
 *   '\\.(css|scss|sass|less)$': '<rootDir>/config/jest/mocks/style-mock.js',
 * }
 *
 * Example Test with CSS Modules:
 * import styles from './Button.module.css';
 *
 * test('applies CSS class', () => {
 *   const button = render(<button className={styles.primary}>Click</button>);
 *   // styles.primary will be undefined, which is fine for most tests
 *   // For actual className testing, use identity-obj-proxy instead
 * });
 *
 * Advanced Alternative (for CSS Modules):
 * For better CSS Modules support, consider using 'identity-obj-proxy':
 *
 * moduleNameMapper: {
 *   '\\.(css|scss|sass|less)$': 'identity-obj-proxy',
 * }
 *
 * This returns className as-is: styles.primary => 'primary'
 *
 * @see https://jestjs.io/docs/webpack#mocking-css-modules
 */

module.exports = {};
