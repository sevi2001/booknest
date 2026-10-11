import { useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';

type Category = 'Self Development' | 'Technology' | 'Finance' | 'Fiction';

type Book = {
  id: number;
  title: string;
  author: string;
  category: Category;
  isbn: string;
  available: boolean;
  color: string;
};

const books: Book[] = [
  {
    id: 1,
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'Self Development',
    isbn: '9780735211292',
    available: true,
    color: '#eee3cb',
  },
  {
    id: 2,
    title: 'Clean Code',
    author: 'Robert C. Martin',
    category: 'Technology',
    isbn: '9780132350884',
    available: true,
    color: '#dbeafe',
  },
  {
    id: 3,
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    category: 'Finance',
    isbn: '9780857197689',
    available: false,
    color: '#dcebe2',
  },
  {
    id: 4,
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    category: 'Fiction',
    isbn: '9780547928227',
    available: true,
    color: '#e5e7c8',
  },
  {
    id: 5,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    category: 'Fiction',
    isbn: '9780743273565',
    available: false,
    color: '#ede9fe',
  },
  {
    id: 6,
    title: 'The Pragmatic Programmer',
    author: 'David Thomas and Andrew Hunt',
    category: 'Technology',
    isbn: '9780135957059',
    available: true,
    color: '#ffedd5',
  },
];

const categories: Category[] = [
  'Self Development',
  'Technology',
  'Finance',
  'Fiction',
];

function BooksPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availability, setAvailability] = useState('All');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const filteredBooks = books.filter((book) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.isbn.includes(query);

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
          <p className="eyebrow">EXPLORE YOUR COLLECTION</p>
          <h1>Book Catalogue</h1>
          <p>Browse and find books in your library.</p>
        </div>
      </div>

      <div className="demo-notice">
        Sample collection · Book management will be added in the next step.
      </div>

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
            <option key={item} value={item}>
              {item}
            </option>
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
        <span>
          Showing {filteredBooks.length} of {books.length} books
        </span>
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

                <span
                  className={`badge ${
                    book.available ? 'badge-green' : 'badge-red'
                  }`}
                >
                  {book.available ? 'Available' : 'Borrowed'}
                </span>

                <button
                  className="secondary-button details-button"
                  onClick={() => setSelectedBook(book)}
                >
                  View Details
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel catalogue-empty">
          <BookOpen size={38} />
          <h2>No books found</h2>
          <p>Try a different search or clear your filters.</p>
          <button className="primary-button" onClick={clearFilters}>
            Clear Filters
          </button>
        </section>
      )}

      {selectedBook && (
        <dialog
          className="book-dialog"
          ref={(dialog) => {
            if (dialog && !dialog.open) {
              dialog.showModal();
            }
          }}
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
            <div>
              <dt>Author</dt>
              <dd>{selectedBook.author}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{selectedBook.category}</dd>
            </div>
            <div>
              <dt>ISBN</dt>
              <dd>{selectedBook.isbn}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={`badge ${
                    selectedBook.available ? 'badge-green' : 'badge-red'
                  }`}
                >
                  {selectedBook.available ? 'Available' : 'Borrowed'}
                </span>
              </dd>
            </div>
          </dl>

          <button
            className="primary-button dialog-done"
            onClick={() => setSelectedBook(null)}
          >
            Done
          </button>
        </dialog>
      )}
    </>
  );
}

export default BooksPage;