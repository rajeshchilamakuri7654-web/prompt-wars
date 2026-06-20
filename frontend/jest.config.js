const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases (this will match your tsconfig.json import-alias)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/CustomDial.tsx',
    'src/components/GlobalComparison.tsx',
    'src/components/OffsetPanel.tsx',
    'src/components/CategoryCard.tsx',
    'src/components/Dashboard.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 55,
      lines: 70,
      statements: 70,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
