/**
 * File Mock for Jest Tests
 *
 * Purpose:
 * - Mocks non-JavaScript file imports in tests (images, fonts, videos, etc.)
 * - Prevents Jest from trying to parse binary/media files
 * - Returns a simple string identifier for assertions
 *
 * Usage:
 * - Automatically applied via Jest's moduleNameMapper configuration
 * - Maps file extensions like .jpg, .png, .woff, .mp4, etc.
 *
 * Jest Configuration (jest.config.js):
 * moduleNameMapper: {
 *   '\\.(jpg|jpeg|png|gif|webp|svg|ico)$': '<rootDir>/config/jest/mocks/file-mock.js',
 *   '\\.(woff|woff2|eot|ttf|otf)$': '<rootDir>/config/jest/mocks/file-mock.js',
 *   '\\.(mp4|webm|ogg|mp3|wav|flac|aac)$': '<rootDir>/config/jest/mocks/file-mock.js',
 * }
 *
 * Example Test:
 * import logo from './logo.png';
 *
 * test('renders logo', () => {
 *   expect(logo).toBe('test-file-stub');
 * });
 *
 * @see https://jestjs.io/docs/webpack#handling-static-assets
 */

module.exports = 'test-file-stub';
