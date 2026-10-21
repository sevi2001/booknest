import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { readLoans, saveLoans, todayDate } from './loanStore';
import type { Loan } from './loanStore';
import { getDefaultLoanDays } from './settingsStore';
import { readReservations } from './reservationStore';

type BookOption = {
  id: string;
  title: string;
  available: boolean;
};

type MemberOption = {
  id: string;
  name: string;
};

type PageData = {
  books: BookOption[];
  members: MemberOption[];
  loans: Loan[];
  error: string;
};

function readCollection(key: string): unknown[] {
  const saved = localStorage.getItem(key);

  if (saved === null) return [];

  const parsed: unknown = JSON.parse(saved);

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid collection.');
  }

  return parsed;
}

function isBookOption(value: unknown): value is BookOption {
  if (typeof value !== 'object' || value === null) return false;

  const book = value as Record<string, unknown>;

  return (
    typeof book.id === 'string' &&
    typeof book.title === 'string' &&
    typeof book.available === 'boolean'
  );
}

function isMemberOption(value: unknown): value is MemberOption {
  if (typeof value !== 'object' || value === null) return false;

  const member = value as Record<string, unknown>;

  return (
    typeof member.id === 'string' &&
    typeof member.name === 'string'
  );
}

function loadPageData(): PageData {
  try {
    const books = readCollection('booknest-books-v1');
    const members = readCollection('booknest-members-v1');

    if (!books.every(isBookOption) || !members.every(isMemberOption)) {
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
      error: 'Could not load saved records. No changes have been made.',
    };
  }
}

function defaultDueDate(): string {
  const date = new Date();
   date.setDate(date.getDate() + getDefaultLoanDays());

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function BorrowReturnPage() {
  const [data, setData] = useState<PageData>(loadPageData);
  const [bookId, setBookId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [dueOn, setDueOn] = useState(defaultDueDate);
  const [filter, setFilter] = useState('Active');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const today = todayDate();

  const availableBooks = data.books.filter(
    (book) =>
      book.available &&
      !data.loans.some(
        (loan) => loan.bookId === book.id && loan.returnedOn === null,
      ),
  );

  const visibleLoans = data.loans.filter((loan) => {
    if (filter === 'Active') return loan.returnedOn === null;
    if (filter === 'Returned') return loan.returnedOn !== null;

    if (filter === 'Overdue') {
      return loan.returnedOn === null && loan.dueOn < today;
    }

    return true;
  });

  function issueBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    // Read fresh records before saving.
    const fresh = loadPageData();

    if (fresh.error) {
      setError(fresh.error);
      return;
    }

    setData(fresh);

    const book = fresh.books.find((item) => item.id === bookId);
    const member = fresh.members.find((item) => item.id === memberId);

    if (!book || !member) {
      setError('Select an existing member and book.');
      return;
    }

    const alreadyBorrowed = fresh.loans.some(
      (loan) => loan.bookId === book.id && loan.returnedOn === null,
    );

    if (!book.available || alreadyBorrowed) {
      setError('This book is already borrowed.');
      return;
    }

    if (!dueOn || dueOn < todayDate()) {
      setError('Choose today or a future date for the return deadline.');
      return;
    }

        let reservationId: string | undefined;

    try {
      const matchingReservation = readReservations().find(
        (reservation) =>
          !reservation.cancelled &&
          reservation.bookId === book.id &&
          reservation.memberId === member.id &&
          !fresh.loans.some(
            (loan) => loan.reservationId === reservation.id,
          ),
      );

      reservationId = matchingReservation?.id;
    } catch {
      setError('Could not check reservations. The book was not issued.');
      return;
    }

    const loan: Loan = {
      id: crypto.randomUUID(),
      bookId: book.id,
      memberId: member.id,
      bookTitle: book.title,
      memberName: member.name,
      issuedOn: todayDate(),
      dueOn,
      returnedOn: null,
      reservationId,
    };

    const nextLoans = [loan, ...fresh.loans];

    try {
      saveLoans(nextLoans);
      setData({ ...fresh, loans: nextLoans });
      setBookId('');
      setMemberId('');
      setDueOn(defaultDueDate());
      setFilter('Active');
            setMessage(
        reservationId
          ? `"${book.title}" issued to ${member.name}. Reservation completed.`
          : `"${book.title}" issued to ${member.name}.`,
      );
    } catch {
      setError('Could not save the loan. Please try again.');
    }
  }

  function returnBook(loanId: string) {
    setError('');
    setMessage('');

    const fresh = loadPageData();

    if (fresh.error) {
      setError(fresh.error);
      return;
    }

    const loan = fresh.loans.find((item) => item.id === loanId);

    if (!loan || loan.returnedOn !== null) {
      setData(fresh);
      setError('This loan is no longer active.');
      return;
    }

    if (!window.confirm(`Confirm return of "${loan.bookTitle}"?`)) {
      return;
    }

    const nextLoans = fresh.loans.map((item) =>
      item.id === loanId
        ? { ...item, returnedOn: todayDate() }
        : item,
    );

    try {
      saveLoans(nextLoans);
      setData({ ...fresh, loans: nextLoans });
      setMessage(`"${loan.bookTitle}" returned successfully.`);
    } catch {
      setError('Could not save the return. Please try again.');
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MANAGE YOUR BOOK LOANS</p>
          <h1>Borrow & Return</h1>
          <p>Issue available books and record their returns.</p>
        </div>
      </div>

      <p className="demo-notice">
        Loan records are saved in this browser. Existing sample borrowed
        books do not have loan records yet.
      </p>

      {message && (
        <div className="catalogue-message" role="status">
          {message}
        </div>
      )}

      {(error || data.error) && (
        <p className="form-error loan-error" role="alert">
          {error || data.error}
        </p>
      )}

      <section className="panel issue-panel">
        <div className="panel-heading">
          <h2>Issue a Book</h2>
          <ArrowLeftRight size={20} />
        </div>

        <form className="book-form issue-form" onSubmit={issueBook}>
          <label>
            Select Member
            <select
              required
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">Choose a member</option>
              {data.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} — {member.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Select Book
            <select
              required
              value={bookId}
              onChange={(event) => setBookId(event.target.value)}
            >
              <option value="">Choose an available book</option>
              {availableBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Issue Date
            <input type="date" value={today} readOnly />
          </label>

          <label>
            Due Date
            <input
              required
              type="date"
              min={today}
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
            />
          </label>

          {data.members.length === 0 && (
            <p className="form-hint issue-full-width">
              Add a member on the Members page first.
            </p>
          )}

          {availableBooks.length === 0 && (
            <p className="form-hint issue-full-width">
              No saved available books were found. Add a book on the Books
              page, or edit an available sample book and save it.
            </p>
          )}

          <button
            type="submit"
            className="primary-button issue-full-width"
            disabled={
              Boolean(data.error) ||
              data.members.length === 0 ||
              availableBooks.length === 0
            }
          >
            Issue Book
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Loan Records</h2>

          <select
            className="loan-filter"
            aria-label="Filter loan records"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Overdue">Overdue</option>
            <option value="Returned">Returned</option>
            <option value="All">All Records</option>
          </select>
        </div>

        {visibleLoans.length === 0 ? (
          <div className="catalogue-empty">
            <ArrowLeftRight size={36} />
            <h2>No matching loans</h2>
            <p>Issue a book or choose another filter.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Book</th>
                  <th scope="col">Member</th>
                  <th scope="col">Issued</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleLoans.map((loan) => {
                  const overdue =
                    loan.returnedOn === null && loan.dueOn < today;

                  return (
                    <tr key={loan.id}>
                      <td className="book-title">{loan.bookTitle}</td>
                      <td>{loan.memberName}</td>
                      <td className="member-date">
                        {formatDate(loan.issuedOn)}
                      </td>
                      <td className="member-date">
                        {formatDate(loan.dueOn)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            overdue ? 'badge-red' : 'badge-green'
                          }`}
                        >
                          {loan.returnedOn
                            ? 'Returned'
                            : overdue
                              ? 'Overdue'
                              : 'Borrowed'}
                        </span>
                      </td>
                      <td>
                        {loan.returnedOn ? (
                          <span className="returned-date">
                            {formatDate(loan.returnedOn)}
                          </span>
                        ) : (
                          <button
                            className="secondary-button"
                            onClick={() => returnBook(loan.id)}
                          >
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default BorrowReturnPage;