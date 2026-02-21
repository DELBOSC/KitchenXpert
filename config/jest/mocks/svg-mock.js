/**
 * SVG Mock for Jest Tests
 *
 * Purpose:
 * - Mocks SVG file imports in tests
 * - Supports both default imports and ReactComponent named imports
 * - Prevents Jest from parsing SVG XML
 *
 * Usage:
 * - Automatically applied via Jest's moduleNameMapper configuration
 * - Handles SVGs imported as React components or file paths
 *
 * Jest Configuration (jest.config.js):
 * moduleNameMapper: {
 *   '\\.svg$': '<rootDir>/config/jest/mocks/svg-mock.js',
 * }
 *
 * Import Patterns:
 *
 * 1. Default import (file path):
 *    import logoUrl from './logo.svg';
 *    // Returns: 'SvgMock'
 *
 * 2. Named import (React component with SVGR):
 *    import { ReactComponent as Logo } from './logo.svg';
 *    // Returns: React component stub
 *
 * Example Test:
 * import { ReactComponent as Icon } from './icon.svg';
 *
 * test('renders SVG icon', () => {
 *   const { container } = render(<Icon data-testid="icon" />);
 *   expect(container.querySelector('svg')).toBeInTheDocument();
 * });
 *
 * Note:
 * - For more advanced SVG testing, consider using @svgr/webpack transformer
 * - This mock provides basic functionality for most test scenarios
 *
 * @see https://react-svgr.com/docs/jest/
 */

const React = require('react');

// Default export: SVG file path (for URL imports)
module.exports = 'SvgMock';

// Named export: React component (for SVGR imports)
// eslint-disable-next-line func-names
module.exports.ReactComponent = function (props) {
  return React.createElement('svg', props);
};
