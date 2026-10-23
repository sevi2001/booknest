import { useState } from 'react';

function ImportBooks() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function importBooks() {
    setMessage('');
    setError('');

    let books: unknown[];

    try {
      const saved = localStorage.getItem('booknest-books-v1');

      if (saved === null) {
        throw new Error(
          'No browser-saved books found. Use the same browser and localhost address as before.',
        );
      }

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Your browser collection is empty or invalid.');
      }

      books = parsed;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not read your saved books.',
      );
      return;
    }

    const confirmed = window.confirm(
      `Copy ${books.length} books to PostgreSQL?\n\n` +
        'Existing ISBNs will be skipped.\n' +
        'Browser records will stay saved.\n' +
        'Borrowing history is not included; new database books start as available.',
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const response = await fetch('/api/import-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(books),
      });

      const result: unknown = await response.json();

      if (typeof result !== 'object' || result === null) {
        throw new Error('Unexpected server response.');
      }

      const data = result as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof data.message === 'string'
            ? data.message
            : 'Import failed.',
        );
      }

      if (
        typeof data.imported !== 'number' ||
        typeof data.skipped !== 'number'
      ) {
        throw new Error('Unexpected import result.');
      }

      setMessage(
        `Imported ${data.imported} books. ` +
          `Skipped ${data.skipped} matching ISBNs. ` +
          'Your browser collection is still saved.',
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not import books.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel issue-panel">
      <div className="panel-heading">
        <h2>Copy Your Existing Collection</h2>
      </div>

      <div style={{ padding: '0 22px 22px' }}>
        <p className="form-hint" style={{ marginBottom: 16 }}>
          Copy browser-saved books and cover paths to PostgreSQL.
          Existing database books will not be overwritten.
        </p>

        <button
          className="primary-button"
          disabled={busy}
          onClick={() => void importBooks()}
        >
          {busy ? 'Importing…' : 'Import Browser Books'}
        </button>

        {message && (
          <p className="catalogue-message" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

export default ImportBooks;