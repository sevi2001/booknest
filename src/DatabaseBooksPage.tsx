import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Search, Pencil, Trash2 } from 'lucide-react';

type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  available: boolean;
  color: string;
  imageUrl: string;
};

type BookForm = {
  title: string;
  author: string;
  category: string;
  isbn: string;
  color: string;
  imageUrl: string;
};

const categories = [
  'Self Development',
  'Technology',
  'Finance',
  'Fiction',
];

function emptyForm(): BookForm {
  return {
    title: '',
    author: '',
    category: 'Technology',
    isbn: '',
    color: '#dbeafe',
    imageUrl: '',
  };
}

function isBook(value: unknown): value is Book {
  if (typeof value !== 'object' || value === null) return false;

  const book = value as Record<string, unknown>;

  return (
    typeof book.id === 'string' &&
    typeof book.title === 'string' &&
    typeof book.author === 'string' &&
    typeof book.category === 'string' &&
    typeof book.isbn === 'string' &&
    typeof book.available === 'boolean' &&
    typeof book.color === 'string' &&
    typeof book.imageUrl === 'string'
  );
}

function getErrorMessage(value: unknown): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  ) {
    return value.message;
  }

  return 'The request could not be completed.';
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(
      'The server returned an unexpected response. Check the backend connection.',
    );
  }
}

function DatabaseBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availability, setAvailability] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const busy = saving || deletingId !== null;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadBooks() {
      try {
        const response = await fetch('/api/books', {
          signal: controller.signal,
          cache: 'no-store',
        });

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(getErrorMessage(data));
        }

        if (!Array.isArray(data) || !data.every(isBook)) {
          throw new Error('The server returned unexpected book data.');
        }

        if (active) {
          setBooks(data);
          setLoadError('');
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Could not load books.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBooks();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reload]);

  function refreshBooks() {
    if (busy) return;

    setLoading(true);
    setLoadError('');
    setActionError('');
    setReload((previous) => previous + 1);
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setActionError('');
    setMessage('');
    setFormOpen(true);
  }

  function openEditForm(book: Book) {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      color: book.color,
      imageUrl: book.imageUrl,
    });
    setFormError('');
    setActionError('');
    setMessage('');
    setFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
  }

  async function saveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || loading) return;

    setSaving(true);
    setFormError('');
    setActionError('');
    setMessage('');

    const wasEditing = editingId !== null;

    try {
      const url = editingId
        ? `/api/books/${encodeURIComponent(editingId)}`
        : '/api/books';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          author: form.author.trim(),
          imageUrl: form.imageUrl.trim(),
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      if (!isBook(data)) {
        throw new Error(
          'Unexpected response. Refresh the collection before trying again.',
        );
      }

      setBooks((previous) => {
        if (wasEditing) {
          return previous.map((book) =>
            book.id === data.id ? data : book,
          );
        }

        return [
          data,
          ...previous.filter((book) => book.id !== data.id),
        ];
      });

      setForm(emptyForm());
      setEditingId(null);
      setFormOpen(false);
      setSearch('');
      setCategory('All');
      setAvailability('All');

      setMessage(
        wasEditing
          ? 'Book updated successfully.'
          : 'Book saved to PostgreSQL successfully.',
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Could not save the book.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteBook(book: Book) {
    if (busy || loading) return;

    setActionError('');
    setMessage('');

    if (!book.available) {
      setActionError('Return this borrowed book before deleting it.');
      return;
    }

    if (!window.confirm(`Delete "${book.title}" from the database?`)) {
      return;
    }

    setDeletingId(book.id);

    try {
      const response = await fetch(
        `/api/books/${encodeURIComponent(book.id)}`,
        {
          method: 'DELETE',
        },
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setBooks((previous) =>
        previous.filter((item) => item.id !== book.id),
      );

      if (editingId === book.id) {
        setFormOpen(false);
        setEditingId(null);
        setForm(emptyForm());
        setFormError('');
      }

      setMessage('Book deleted successfully.');
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could not delete the book.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  const query = search.trim().toLowerCase();

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.isbn.toLowerCase().includes(query);

    const matchesCategory =
      category === 'All' || book.category === category;

    const matchesAvailability =
      availability === 'All' ||
      (availability === 'Available' && book.available) ||
      (availability === 'Borrowed' && !book.available);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  function clearFilters() {
    setSearch('');
    setCategory('All');
    setAvailability('All');
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR DATABASE COLLECTION</p>
          <h1>Book Catalogue</h1>
          <p>Manage books stored in PostgreSQL.</p>
        </div>

        <div className="action-buttons">
          <button
            className="secondary-button"
            disabled={loading || busy}
            onClick={refreshBooks}
          >
            Refresh
          </button>

          <button
            className="primary-button"
            disabled={loading || busy}
            onClick={openAddForm}
          >
            + Add Book
          </button>
        </div>
      </div>

      {message && (
        <div className="catalogue-message" role="status">
          {message}
        </div>
      )}

      {actionError && (
        <p className="form-error loan-error" role="alert">
          {actionError}
        </p>
      )}

      {formOpen && (
        <section className="panel issue-panel">
          <div className="panel-heading">
            <h2>{editingId ? 'Edit Book' : 'Add Book'}</h2>

            <button
              type="button"
              className="text-button"
              disabled={saving}
              onClick={closeForm}
            >
              Close
            </button>
          </div>

          <form className="book-form issue-form" onSubmit={saveBook}>
            <label>
              Book Title
              <input
                required
                maxLength={150}
                disabled={saving}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>

            <label>
              Author
              <input
                required
                maxLength={150}
                disabled={saving}
                value={form.author}
                onChange={(event) =>
                  setForm({ ...form, author: event.target.value })
                }
              />
            </label>

            <label>
              Category
              <select
                disabled={saving}
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              ISBN
              <input
                required
                maxLength={25}
                disabled={saving}
                value={form.isbn}
                onChange={(event) =>
                  setForm({ ...form, isbn: event.target.value })
                }
              />
            </label>

            <label>
              Book Cover Image Path
              <input
                maxLength={500}
                disabled={saving}
                placeholder="/books/deep-work.jpg"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
              />
            </label>

            <label>
              Cover Colour
              <input
                type="color"
                disabled={saving}
                value={form.color}
                onChange={(event) =>
                  setForm({ ...form, color: event.target.value })
                }
              />
            </label>

            <p className="form-hint issue-full-width">
              Image paths are optional. Put cover files in public/books.
              Editing book details does not change borrowing status.
            </p>

            {formError && (
              <p
                className="form-error issue-full-width"
                role="alert"
              >
                {formError}
              </p>
            )}

            <div className="form-actions issue-full-width">
              <button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={closeForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={busy || loading}
              >
                {saving
                  ? 'Saving…'
                  : editingId
                    ? 'Save Changes'
                    : 'Save Book'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="catalogue-filters" aria-label="Filter books">
        <div className="search-field">
          <Search size={19} aria-hidden="true" />

          <input
            type="search"
            aria-label="Search books"
            placeholder="Search title, author or ISBN..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="loan-filter"
          aria-label="Filter category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="All">All Categories</option>

          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          className="loan-filter"
          aria-label="Filter availability"
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        >
          <option value="All">All Availability</option>
          <option value="Available">Available</option>
          <option value="Borrowed">Borrowed</option>
        </select>
      </section>

      {loading ? (
        <p role="status">Loading books…</p>
      ) : loadError ? (
        <div className="form-error loan-error" role="alert">
          {loadError} Check that your backend is running, then click Refresh.
        </div>
      ) : (
        <>
          <div className="catalogue-summary">
            <span>
              Showing {filteredBooks.length} of {books.length} books
            </span>

            <button className="text-button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>

          {filteredBooks.length === 0 ? (
            <section className="panel catalogue-empty">
              <BookOpen size={38} />
              <h2>No books found</h2>
              <p>Add a book or change your search filters.</p>
            </section>
          ) : (
            <section className="books-grid" aria-label="Books">
              {filteredBooks.map((book) => (
                <article className="catalogue-card" key={book.id}>
                  <div
                    className="catalogue-cover"
                    style={{ backgroundColor: book.color }}
                  >
                    {book.imageUrl ? (
                      <img
                        className="catalogue-cover-image"
                        src={book.imageUrl}
                        alt={`Cover of ${book.title}`}
                        loading="lazy"
                      />
                    ) : (
                      <>
                        <BookOpen size={38} aria-hidden="true" />
                        <span>{book.title}</span>
                      </>
                    )}
                  </div>

                  <div className="catalogue-card-body">
                    <span className="book-category">
                      {book.category}
                    </span>

                    <h2>{book.title}</h2>
                    <p className="catalogue-author">{book.author}</p>
                    <p className="book-isbn">ISBN: {book.isbn}</p>

                    <span
                      className={`badge ${
                        book.available ? 'badge-green' : 'badge-red'
                      }`}
                    >
                      {book.available ? 'Available' : 'Borrowed'}
                    </span>

                    <div className="book-card-actions">
                      <button
                        className="secondary-button icon-button"
                        disabled={busy}
                        aria-label={`Edit ${book.title}`}
                        onClick={() => openEditForm(book)}
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        className="danger-button icon-button"
                        disabled={busy || !book.available}
                        aria-label={`Delete ${book.title}`}
                        title={
                          !book.available
                            ? 'Return this book before deleting it'
                            : undefined
                        }
                        onClick={() => void deleteBook(book)}
                      >
                        <Trash2 size={15} />
                        {deletingId === book.id
                          ? 'Deleting…'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

export default DatabaseBooksPage;