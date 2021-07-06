/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
	testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
	testEnvironment: 'node',
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'clover'],
	coverageThreshold: {
		global: {
			branches: 70,
			lines: 70,
			statements: 70,
		},
	},
	roots: ['<rootDir>src/'],
	setupFiles: ['./jest-setup.ts'],
};
