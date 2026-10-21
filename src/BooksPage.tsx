import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Search, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { readLoans } from './loanStore';

const categories = [
  'Self Development',
  'Technology',
  'Finance',
  'Fiction',
] as const;

type Category = (typeof categories)[number];

type Book = {
  id: string;
  title: string;
  author: string;
  category: Category;
  isbn: string;
  available: boolean;
  color: string;
};

type BookForm = Omit<Book, 'id'>;

const STORAGE_KEY = 'booknest-books-v1';

const initialBooks: Book[] = [
  {
    id: '1',
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'Self Development',
    isbn: '9780735211292',
    available: true,
    color: '#eee3cb',
  },
  {
    id: '2',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    category: 'Technology',
    isbn: '9780132350884',
    available: true,
    color: '#dbeafe',
  },
  {
    id: '3',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    category: 'Finance',
    isbn: '9780857197689',
    available: false,
    color: '#dcebe2',
  },
  {
    id: '4',
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    category: 'Fiction',
    isbn: '9780547928227',
    available: true,
    color: '#e5e7c8',
  },
  {
    id: '5',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    category: 'Fiction',
    isbn: '9780743273565',
    available: false,
    color: '#ede9fe',
  },
  {
    id: '6',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas and Andrew Hunt',
    category: 'Technology',
    isbn: '9780135957059',
    available: true,
    color: '#ffedd5',
  },
];

function isBook(value: unknown): value is Book {
  if (typeof value !== 'object' || value === null) return false;

  const book = value as Record<string, unknown>;

  return (
    typeof book.id === 'string' &&
    typeof book.title === 'string' &&
    typeof book.author === 'string' &&
    typeof book.category === 'string' &&
    categories.some((category) => category === book.category) &&
    typeof book.isbn === 'string' &&
    typeof book.available === 'boolean' &&
    typeof book.color === 'string' &&
    /^#[0-9a-f]{6}$/i.test(book.color)
  );
}

function loadStoredBooks(): Book[] {
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return initialBooks;

    const parsed: unknown = JSON.parse(saved);

    if (Array.isArray(parsed) && parsed.every(isBook)) {
      return parsed;
    }
  } catch {
    // Fall back to sample books if saved data cannot be read.
  }

  return initialBooks;
}

function emptyForm(): BookForm {
  return {
    title: '',
    author: '',
    category: 'Technology',
    isbn: '',
    available: true,
    color: '#dbeafe',
  };
}
function loadBooks(): Book[] {
  const books = loadStoredBooks();

  try {
    const activeLoans = readLoans().filter(
      (loan) => loan.returnedOn === null,
    );

    return books.map((book) => ({
      ...book,
      available:
        book.available &&
        !activeLoans.some((loan) => loan.bookId === book.id),
    }));
  } catch {
    // Disable book changes if borrowing records cannot be checked.
    return books.map((book) => ({
      ...book,
      available: false,
    }));
  }
}

function BooksPage() {
  const [books, setBooks] = useState<Book[]>(loadBooks);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availability, setAvailability] = useState('All');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const detailsRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (selectedBook && detailsRef.current && !detailsRef.current.open) {
      detailsRef.current.showModal();
    }
  }, [selectedBook]);

  useEffect(() => {
    if (formOpen && formRef.current && !formRef.current.open) {
      formRef.current.showModal();
    }
  }, [formOpen]);

  // Save before updating the UI so failed saves are reported accurately.
  function saveCollection(nextBooks: Book[], successMessage: string) {
    try {
           const activeLoans = readLoans().filter(
        (loan) => loan.returnedOn === null,
      );

      const storedBooks = loadStoredBooks();

      const booksToStore = nextBooks.map((book) => {
        const hasActiveLoan = activeLoans.some(
          (loan) => loan.bookId === book.id,
        );

        const original = storedBooks.find(
          (item) => item.id === book.id,
        );

        // Keep loan availability separate from the stored book record.
        return hasActiveLoan
          ? { ...book, available: original?.available ?? true }
          : book;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(booksToStore));
      setBooks(nextBooks);
      setMessage(successMessage);
      return true;
    } catch {
      setMessage('Could not save changes. Please check your browser storage.');
      return false;
    }
  }

  function clearFilters() {
    setSearch('');
    setCategory('All');
    setAvailability('All');
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  }

  function openEditForm(book: Book) {
    setSelectedBook(null);
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      available: book.available,
      color: book.color,
    });
    setFormError('');
    setFormOpen(true);
  }

  function submitBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedForm: BookForm = {
      ...form,
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.replace(/[\s-]/g, ''),
    };

    if (!cleanedForm.title || !cleanedForm.author) {
      setFormError('Enter a book title and author.');
      return;
    }

    if (!/^(?:\d{9}[\dXx]|\d{13})$/.test(cleanedForm.isbn)) {
      setFormError('Enter a 10-character or 13-digit ISBN.');
      return;
    }

    cleanedForm.isbn = cleanedForm.isbn.toUpperCase();

    const duplicate = books.some(
      (book) =>
        book.id !== editingId && book.isbn === cleanedForm.isbn,
    );

    if (duplicate) {
      setFormError('A book with this ISBN already exists.');
      return;
    }

    const nextBooks = editingId
      ? books.map((book) =>
          book.id === editingId ? { ...book, ...cleanedForm } : book,
        )
      : [...books, { ...cleanedForm, id: crypto.randomUUID() }];

    const saved = saveCollection(
      nextBooks,
      editingId ? 'Book updated successfully.' : 'Book added successfully.',
    );

    if (saved) {
      clearFilters();
      setFormOpen(false);
    } else {
      setFormError('The book could not be saved. Please try again.');
    }
  }

  function deleteBook(book: Book) {
    if (!book.available) {
      setMessage('Return this borrowed book before deleting it.');
      return;
    }

    if (!window.confirm(`Delete "${book.title}"?`)) return;

    if (
      saveCollection(
        books.filter((item) => item.id !== book.id),
        'Book deleted successfully.',
      )
    ) {
      setSelectedBook(null);
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

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPLORE YOUR COLLECTION</p>
          <h1>Book Catalogue</h1>
          <p>Manage and find books in your library.</p>
        </div>

        <button className="primary-button icon-button" onClick={openAddForm}>
          <Plus size={18} />
          Add Book
        </button>
      </div>

      <div className="demo-notice">
        Books are saved in this browser. Dashboard figures are still sample data.
      </div>

      {message && (
        <div className="catalogue-message" role="status">
          {message}
        </div>
      )}

      <section className="catalogue-filters" aria-label="Filter books">
        <div className="search-field">
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search books"
            placeholder="Search by title, author or ISBN..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select
          aria-label="Filter by availability"
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        >
          <option value="All">All Availability</option>
          <option value="Available">Available</option>
          <option value="Borrowed">Borrowed</option>
        </select>
      </section>

      <div className="catalogue-summary">
        <span>Showing {filteredBooks.length} of {books.length} books</span>
        <button className="text-button" onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      {filteredBooks.length > 0 ? (
        <section className="books-grid" aria-label="Book collection">
          {filteredBooks.map((book) => (
            <article className="catalogue-card" key={book.id}>
              <div
                className="catalogue-cover"
                style={{ backgroundColor: book.color }}
              >
                <BookOpen size={38} aria-hidden="true" />
                <span>{book.title}</span>
              </div>

              <div className="catalogue-card-body">
                <span className="book-category">{book.category}</span>
                <h2>{book.title}</h2>
                <p className="catalogue-author">{book.author}</p>

                <span className={`badge ${book.available ? 'badge-green' : 'badge-red'}`}>
                  {book.available ? 'Available' : 'Borrowed'}
                </span>

                <button
                  className="secondary-button details-button"
                  onClick={() => setSelectedBook(book)}
                >
                  View Details
                </button>

                <div className="book-card-actions">
                  <button
                    className="secondary-button icon-button"
                    onClick={() => openEditForm(book)}
                    aria-label={`Edit ${book.title}`}
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    className="danger-button icon-button"
                    onClick={() => deleteBook(book)}
                    disabled={!book.available}
                    aria-label={`Delete ${book.title}`}
                    title={!book.available ? 'Return this book before deleting it' : undefined}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel catalogue-empty">
          <BookOpen size={38} />
          <h2>No books found</h2>
          <p>Add a book or try different filters.</p>
          <button className="primary-button" onClick={clearFilters}>
            Clear Filters
          </button>
        </section>
      )}

      {selectedBook && (
        <dialog
          ref={detailsRef}
          className="book-dialog"
          aria-labelledby="book-dialog-title"
          onCancel={() => setSelectedBook(null)}
          onClose={() => setSelectedBook(null)}
        >
          <div className="dialog-heading">
            <h2 id="book-dialog-title">Book Details</h2>
            <button
              className="dialog-close"
              aria-label="Close book details"
              autoFocus
              onClick={() => setSelectedBook(null)}
            >
              <X size={22} />
            </button>
          </div>

          <div
            className="dialog-cover"
            style={{ backgroundColor: selectedBook.color }}
          >
            <BookOpen size={44} aria-hidden="true" />
          </div>

          <h3 className="dialog-book-title">{selectedBook.title}</h3>

          <dl className="book-details">
            <div><dt>Author</dt><dd>{selectedBook.author}</dd></div>
            <div><dt>Category</dt><dd>{selectedBook.category}</dd></div>
            <div><dt>ISBN</dt><dd>{selectedBook.isbn}</dd></div>
            <div>
              <dt>Status</dt>
              <dd>{selectedBook.available ? 'Available' : 'Borrowed'}</dd>
            </div>
          </dl>

          <button
            className="primary-button dialog-done"
            onClick={() => openEditForm(selectedBook)}
          >
            Edit Book
          </button>
        </dialog>
      )}

      {formOpen && (
        <dialog
          ref={formRef}
          className="book-dialog"
          aria-labelledby="book-form-title"
          onCancel={() => setFormOpen(false)}
          onClose={() => setFormOpen(false)}
        >
          <div className="dialog-heading">
            <h2 id="book-form-title">
              {editingId ? 'Edit Book' : 'Add Book'}
            </h2>
            <button
              className="dialog-close"
              aria-label="Close book form"
              onClick={() => setFormOpen(false)}
            >
              <X size={22} />
            </button>
          </div>

          <form className="book-form" onSubmit={submitBook}>
            <label>
              Book Title
              <input
                required
                autoFocus
                maxLength={150}
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
                value={form.author}
                onChange={(event) =>
                  setForm({ ...form, author: event.target.value })
                }
              />
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as Category })
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              ISBN
              <input
                required
                placeholder="Example: 9780132350884"
                maxLength={25}
                value={form.isbn}
                onChange={(event) =>
                  setForm({ ...form, isbn: event.target.value })
                }
              />
            </label>

            <label>
              Cover Colour
              <input
                type="color"
                value={form.color}
                onChange={(event) =>
                  setForm({ ...form, color: event.target.value })
                }
              />
            </label>

            <p className="form-hint">
              New books start as available. Borrowing and returning will
              control availability in a later step.
            </p>

            {formError && (
              <p className="form-error" role="alert">{formError}</p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                {editingId ? 'Save Changes' : 'Add Book'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

export default BooksPage;