/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/test/__mocks__/fileMock.js',
        '^src/services/firebase$': '<rootDir>/src/test/__mocks__/services/firebase.ts',
        '^./firebase$': '<rootDir>/src/test/__mocks__/services/firebase.ts',
        '^../firebase$': '<rootDir>/src/test/__mocks__/services/firebase.ts',
        '^../../firebase$': '<rootDir>/src/test/__mocks__/services/firebase.ts',
        '^../services/firebase$': '<rootDir>/src/test/__mocks__/services/firebase.ts',
        '^../../services/firebase$': '<rootDir>/src/test/__mocks__/services/firebase.ts',
        '^../../../services/firebase$': '<rootDir>/src/test/__mocks__/services/firebase.ts',
        '^@firebase/(.*)$': '<rootDir>/src/test/__mocks__/firebase.ts',
        '^firebase/(.*)$': '<rootDir>/src/test/__mocks__/firebase.ts'
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true
            }
        }],
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
        '!src/test/**/*',
        '!src/types/**/*',
        '!**/node_modules/**'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
        '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testTimeout: 10000,
    transformIgnorePatterns: [
        'node_modules/(?!(@firebase|firebase)/)'
    ],
    maxWorkers: 1
};
