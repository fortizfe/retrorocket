import { vi } from 'vitest';
import React from 'react';

// Mock useTranslation hook
export const useTranslation = vi.fn(() => ({
  t: (key: string) => key,
  i18n: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
}));

// Mock Translation component
export const Translation = ({ children }: { children: any }) => children;

// Mock Trans component
export const Trans = ({ children }: { children: React.ReactNode }) => <span>{children}</span>;

// Mock I18nextProvider
export const I18nextProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Mock initReactI18next
export const initReactI18next = {
  type: '3rdParty',
  init: vi.fn(),
};

export default {
  useTranslation,
  Translation,
  Trans,
  I18nextProvider,
  initReactI18next,
};
