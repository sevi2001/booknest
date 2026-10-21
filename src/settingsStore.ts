export type LibrarySettings = {
  libraryName: string;
  loanDays: number;
};

const STORAGE_KEY = 'booknest-settings-v1';

export const defaultSettings: LibrarySettings = {
  libraryName: 'BookNest',
  loanDays: 14,
};

export function readSettings(): LibrarySettings {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved === null) return { ...defaultSettings };

  const parsed: unknown = JSON.parse(saved);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid saved settings.');
  }

  const settings = parsed as Record<string, unknown>;

  if (
    typeof settings.libraryName !== 'string' ||
    settings.libraryName.trim().length === 0 ||
    settings.libraryName.length > 40 ||
    typeof settings.loanDays !== 'number' ||
    !Number.isInteger(settings.loanDays) ||
    settings.loanDays < 1 ||
    settings.loanDays > 90
  ) {
    throw new Error('Invalid saved settings.');
  }

  return {
    libraryName: settings.libraryName.trim(),
    loanDays: settings.loanDays,
  };
}

export function saveSettings(settings: LibrarySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getDefaultLoanDays(): number {
  try {
    return readSettings().loanDays;
  } catch {
    return defaultSettings.loanDays;
  }
}