import { useEffect, useState } from 'react';
import {
  BookOpen,
  Users,
  ArrowLeftRight,
  AlertCircle,
} from 'lucide-react';
import { readLoans, todayDate } from './loanStore';
import type { Loan } from './loanStore';

type DashboardBook = {
  id: string;
  title: string;
  author: string;
};

type DashboardMember = {
  id: string;
};

type DashboardData = {
  books: DashboardBook[];
  members: DashboardMember[];
  loans: Loan[];
  error: string;
};

type DashboardProps = {
  onOpenBooks: () => void;
  onOpenLoans: () => void;
};

function readCollection(key: string): unknown[] {
  const saved = localStorage.getItem(key);

  if (saved === null) return [];

  const parsed: unknown = JSON.parse(saved);

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid saved collection.');
  }

  return parsed;
}

function isDashboardBook(value: unknown): value is DashboardBook {
  if (typeof value !== 'object' || value === null) return false;

  const book = value as Record<string, unknown>;

  return (
    typeof book.id === 'string' &&
    typeof book.title === 'string' &&
    typeof book.author === 'string'
  );
}

function isDashboardMember(value: unknown): value is DashboardMember {
  if (typeof value !== 'object' || value === null) return false;

  const member = value as Record<string, unknown>;

  return typeof member.id === 'string';
}

function loadDashboard(): DashboardData {
  try {
    const books = readCollection('booknest-books-v1');
    const members = readCollection('booknest-members-v1');

    if (
      !books.every(isDashboardBook) ||
      !members.every(isDashboardMember)
    ) {
      throw new Error('Invalid saved data.');
    }

    return {
      books,
      members,
      loans: readLoans(),
      error: '',
    };
  } catch {
    return {
      books: [],
      members: [],
      loans: [],
      error: 'Could not load dashboard records. Please try refreshing.',
    };
  }
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function DashboardPage({
  onOpenBooks,
  onOpenLoans,
}: DashboardProps) {
  const [data, setData] = useState<DashboardData>(loadDashboard);
    const [totalBooks, setTotalBooks] = useState<number | null>(null);
  const [booksError, setBooksError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadBookTotal() {
      try {
        const response = await fetch('/api/books', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Could not load the book total.');
        }

        const books: unknown = await response.json();

        if (!Array.isArray(books)) {
          throw new Error('Unexpected book data.');
        }

        if (active) {
          setTotalBooks(books.length);
          setBooksError('');
        }
      } catch {
        if (active) {
          setBooksError('Could not load the database book total.');
        }
      }
    }

    void loadBookTotal();

    return () => {
      active = false;
      controller.abort();
    };
  }, [data]);

  const today = todayDate();

  const activeLoans = data.loans.filter(
    (loan) => loan.returnedOn === null,
  );

  const overdueLoans = activeLoans.filter(
    (loan) => loan.dueOn < today,
  );

  const recentLoans = [...data.loans]
    .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn))
    .slice(0, 5);

  const popularBooks = data.books
    .map((book) => ({
      ...book,
      loanCount: data.loans.filter(
        (loan) => loan.bookId === book.id,
      ).length,
    }))
    .filter((book) => book.loanCount > 0)
    .sort((a, b) => b.loanCount - a.loanCount)
    .slice(0, 3);

  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LIBRARY AT A GLANCE</p>
          <h1>Welcome back!</h1>
          <p>Here’s what’s happening in your library today.</p>
        </div>

        <div className="dashboard-date-actions">
          <span className="today">{dateLabel}</span>
          <button
            className="secondary-button"
            onClick={() => setData(loadDashboard())}
          >
            Refresh Data
          </button>
        </div>
      </div>
      <p className="demo-notice">
        Total Books uses PostgreSQL. Members, loans, and borrowing
        history still use browser storage until we migrate them.
      </p>

      {data.error ? (
        <div className="form-error" role="alert">
          {data.error}
        </div>
      ) : (
        <>
          <section className="stats-grid" aria-label="Library statistics">
            <article className="stat-card green">
              <div className="stat-heading">
                <span>Total Books</span>
                <BookOpen size={22} />
              </div>
                           <strong>
                {booksError
                  ? '—'
                  : totalBooks === null
                    ? '…'
                    : totalBooks.toLocaleString()}
              </strong>
              <p>
                {booksError || 'Books saved in PostgreSQL'}
              </p>
            </article>

            <article className="stat-card blue">
              <div className="stat-heading">
                <span>Members</span>
                <Users size={22} />
              </div>
              <strong>{data.members.length.toLocaleString()}</strong>
              <p>Registered library members</p>
            </article>

            <article className="stat-card amber">
              <div className="stat-heading">
                <span>Borrowed</span>
                <ArrowLeftRight size={22} />
              </div>
              <strong>{activeLoans.length.toLocaleString()}</strong>
              <p>Books currently on loan</p>
            </article>

            <article className="stat-card red">
              <div className="stat-heading">
                <span>Overdue</span>
                <AlertCircle size={22} />
              </div>
              <strong>{overdueLoans.length.toLocaleString()}</strong>
              <p>Past their return deadline</p>
            </article>
          </section>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Recent Loans</h2>
                <button className="text-button" onClick={onOpenLoans}>
                  View all →
                </button>
              </div>

              {recentLoans.length === 0 ? (
                <div className="dashboard-empty">
                  <ArrowLeftRight size={30} />
                  <h3>No loans yet</h3>
                  <p>Issue a book to see borrowing activity here.</p>
                  <button
                    className="primary-button"
                    onClick={onOpenLoans}
                  >
                    Manage Loans
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Book Title</th>
                        <th scope="col">Member</th>
                        <th scope="col">Due Date</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentLoans.map((loan) => {
                        const overdue =
                          loan.returnedOn === null &&
                          loan.dueOn < today;

                        return (
                          <tr key={loan.id}>
                            <td className="book-title">
                              {loan.bookTitle}
                            </td>
                            <td>{loan.memberName}</td>
                            <td className="member-date">
                              {formatDate(loan.dueOn)}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  overdue
                                    ? 'badge-red'
                                    : 'badge-green'
                                }`}
                              >
                                {loan.returnedOn
                                  ? 'Returned'
                                  : overdue
                                    ? 'Overdue'
                                    : 'Borrowed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Popular Books</h2>
                <button className="text-button" onClick={onOpenBooks}>
                  View all →
                </button>
              </div>

              {popularBooks.length === 0 ? (
                <div className="dashboard-empty">
                  <BookOpen size={30} />
                  <h3>No borrowing history yet</h3>
                  <p>Your most borrowed books will appear here.</p>
                </div>
              ) : (
                <div className="popular-list">
                  {popularBooks.map((book, index) => (
                    <div className="popular-book" key={book.id}>
                      <div className={`book-cover cover-${index}`}>
                        <BookOpen size={24} />
                      </div>

                      <div className="popular-book-info">
                        <h3>{book.title}</h3>
                        <p>{book.author}</p>
                      </div>

                      <span className="loan-count">
                        {book.loanCount}{' '}
                        {book.loanCount === 1 ? 'loan' : 'loans'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="quick-actions">
            <div>
              <h2>Keep your library organised</h2>
              <p>Explore your collection or manage a book loan.</p>
            </div>

            <div className="action-buttons">
              <button
                className="secondary-button"
                onClick={onOpenBooks}
              >
                Browse Books
              </button>
              <button
                className="primary-button"
                onClick={onOpenLoans}
              >
                Manage Loans
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default DashboardPage;