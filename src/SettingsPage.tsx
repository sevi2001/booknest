import { useState } from 'react';
import type { FormEvent } from 'react';
import { Settings } from 'lucide-react';
import {
  defaultSettings,
  readSettings,
  saveSettings,
} from './settingsStore';
import type { LibrarySettings } from './settingsStore';

type SettingsPageProps = {
  onSettingsSaved: (settings: LibrarySettings) => void;
};

function loadForm() {
  try {
    return {
      settings: readSettings(),
      error: '',
    };
  } catch {
    return {
      settings: { ...defaultSettings },
      error:
        'Saved settings could not be read. Review the values and save to replace them.',
    };
  }
}

function SettingsPage({ onSettingsSaved }: SettingsPageProps) {
  const [initial] = useState(loadForm);
  const [libraryName, setLibraryName] = useState(
    initial.settings.libraryName,
  );
  const [loanDays, setLoanDays] = useState(
    String(initial.settings.loanDays),
  );
  const [error, setError] = useState(initial.error);
  const [message, setMessage] = useState('');

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const name = libraryName.trim();
    const days = Number(loanDays);

    if (!name || name.length > 40) {
      setError('Enter a library name between 1 and 40 characters.');
      return;
    }

    if (!Number.isInteger(days) || days < 1 || days > 90) {
      setError('Enter a borrowing period between 1 and 90 days.');
      return;
    }

    const settings: LibrarySettings = {
      libraryName: name,
      loanDays: days,
    };

    try {
      saveSettings(settings);
      onSettingsSaved(settings);
      setLibraryName(name);
      setMessage('Settings saved successfully.');
    } catch {
      setError('Could not save settings. Please try again.');
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMISE YOUR LIBRARY</p>
          <h1>Settings</h1>
          <p>Manage your library name and borrowing defaults.</p>
        </div>
      </div>

      <p className="demo-notice">
        Settings are saved in this browser.
      </p>

      {message && (
        <div className="catalogue-message" role="status">
          {message}
        </div>
      )}

      <section className="panel settings-panel">
        <div className="panel-heading">
          <h2>Library Preferences</h2>
          <Settings size={20} />
        </div>

        <form className="book-form settings-form" onSubmit={handleSave}>
          <label>
            Library Name
            <input
              required
              maxLength={40}
              placeholder="Example: BookNest"
              value={libraryName}
              onChange={(event) => {
                setLibraryName(event.target.value);
                setMessage('');
              }}
            />
          </label>

          <label>
            Default Borrowing Period
            <input
              required
              type="number"
              min={1}
              max={90}
              step={1}
              value={loanDays}
              onChange={(event) => {
                setLoanDays(event.target.value);
                setMessage('');
              }}
            />
          </label>

          <p className="form-hint">
            Enter the number of days a member can borrow a book.
            This sets the suggested due date for new loans.
            Existing loan deadlines stay the same.
          </p>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" className="primary-button">
              Save Settings
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

export default SettingsPage;