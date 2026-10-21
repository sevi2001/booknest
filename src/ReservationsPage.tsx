import { useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarClock } from 'lucide-react';
import { readLoans, todayDate } from './loanStore';
import type { Loan } from './loanStore';

type Book = {
  id: string;
  title: string;
  available: boolean;
};

type Member = {
  id: string;
  name: string;
};

type Reservation = {
  id: string;
  bookId: string;
  memberId: string;
  bookTitle: string;
  memberName: string;
  createdOn: string;
  cancelled: boolean;
};

type PageData = {
  books: Book[];
  members: Member[];
  loans: Loan[];
  reservations: Reservation[];
  error: string;
};

const STORAGE_KEY = 'booknest-reservations-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBook(value: unknown): value is Book {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.available === 'boolean'
  );
}

function isMember(value: unknown): value is Member {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  );
}

function isReservation(value: unknown): value is Reservation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.bookId === 'string' &&
    typeof value.memberId === 'string' &&
    typeof value.bookTitle === 'string' &&
    typeof value.memberName === 'string' &&
    typeof value.createdOn === 'string' &&
    typeof value.cancelled === 'boolean'
  );
}

function readList<T>(
  key: string,
  validator: (value: unknown) => value is T,
): T[] {
  const saved = localStorage.getItem(key);

  if (saved === null) return [];

  const parsed: unknown = JSON.parse(saved);

  if (!Array.isArray(parsed) || !parsed.every(validator)) {
    throw new Error('Invalid saved records.');
  }

  return parsed;
}

function loadData(): PageData {
  try {
    return {
      books: readList('booknest-books-v1', isBook),
      members: readList('booknest-members-v1', isMember),
      loans: readLoans(),
      reservations: readList(STORAGE_KEY, isReservation),
      error: '',
    };
  } catch {
    return {
      books: [],
      members: [],
      loans: [],
      reservations: [],
      error: 'Could not load records. No changes have been made.',
    };
  }
}

function isBorrowed(book: Book, loans: Loan[]): boolean {
  return (
    !book.available ||
    loans.some(
      (loan) => loan.bookId === book.id && loan.returnedOn === null,
    )
  );
}

type Status = 'Cancelled' | 'Unavailable' | 'Waiting' | 'Ready';

function getStatus(
  reservation: Reservation,
  data: PageData,
): Status {
  if (reservation.cancelled) return 'Cancelled';

  const book = data.books.find(
    (item) => item.id === reservation.bookId,
  );

  const memberExists = data.members.some(
    (item) => item.id === reservation.memberId,
  );

  if (!book || !memberExists) return 'Unavailable';

  return isBorrowed(book, data.loans) ? 'Waiting' : 'Ready';
}

function ReservationsPage() {
  const [data, setData] = useState<PageData>(loadData);
  const [bookId, setBookId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [filter, setFilter] = useState('Active');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const borrowedBooks = data.books.filter((book) =>
    isBorrowed(book, data.loans),
  );

  const visibleReservations = data.reservations.filter(
    (reservation) => {
      if (filter === 'Active') return !reservation.cancelled;
      if (filter === 'Cancelled') return reservation.cancelled;

      return true;
    },
  );

  function save(
    fresh: PageData,
    reservations: Reservation[],
    successMessage: string,
  ): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
      setData({ ...fresh, reservations });
      setMessage(successMessage);
      return true;
    } catch {
      setError('Could not save changes. Please try again.');
      return false;
    }
  }

  function reserveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const fresh = loadData();

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

    if (!isBorrowed(book, fresh.loans)) {
      setError('This book is available. Issue it through Borrow & Return.');
      return;
    }

    const memberHasBook = fresh.loans.some(
      (loan) =>
        loan.bookId === book.id &&
        loan.memberId === member.id &&
        loan.returnedOn === null,
    );

    if (memberHasBook) {
      setError('This member is already borrowing this book.');
      return;
    }

    const duplicate = fresh.reservations.some(
      (reservation) =>
        !reservation.cancelled &&
        reservation.bookId === book.id &&
        reservation.memberId === member.id,
    );

    if (duplicate) {
      setError('This member already has an active reservation for this book.');
      return;
    }

    const reservation: Reservation = {
      id: crypto.randomUUID(),
      bookId: book.id,
      memberId: member.id,
      bookTitle: book.title,
      memberName: member.name,
      createdOn: todayDate(),
      cancelled: false,
    };

    if (
      save(
        fresh,
        [reservation, ...fresh.reservations],
        `Book reserved for ${member.name}.`,
      )
    ) {
      setBookId('');
      setMemberId('');
      setFilter('Active');
    }
  }

  function cancelReservation(id: string) {
    setMessage('');
    setError('');

    const fresh = loadData();

    if (fresh.error) {
      setError(fresh.error);
      return;
    }

    const reservation = fresh.reservations.find(
      (item) => item.id === id,
    );

    if (!reservation || reservation.cancelled) {
      setData(fresh);
      setError('This reservation is no longer active.');
      return;
    }

    if (!window.confirm('Cancel this reservation?')) return;

    const nextReservations = fresh.reservations.map((item) =>
      item.id === id ? { ...item, cancelled: true } : item,
    );

    save(fresh, nextReservations, 'Reservation cancelled.');
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PLAN THE NEXT BORROW</p>
          <h1>Reservations</h1>
          <p>Reserve borrowed books for library members.</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => {
            setData(loadData());
            setMessage('');
            setError('');
          }}
        >
          Refresh Data
        </button>
      </div>

      <p className="demo-notice">
        Ready means the book is available. Reservations currently track
        requests; they do not hold books or enforce a borrowing queue.
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
          <h2>Reserve a Book</h2>
          <CalendarClock size={20} />
        </div>

        <form className="book-form issue-form" onSubmit={reserveBook}>
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
            Select Borrowed Book
            <select
              required
              value={bookId}
              onChange={(event) => setBookId(event.target.value)}
            >
              <option value="">Choose a borrowed book</option>
              {borrowedBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>

          {borrowedBooks.length === 0 && (
            <p className="form-hint issue-full-width">
              No borrowed books found. Issue a book through Borrow & Return
              first.
            </p>
          )}

          {data.members.length === 0 && (
            <p className="form-hint issue-full-width">
              Add members on the Members page first.
            </p>
          )}

          <button
            type="submit"
            className="primary-button issue-full-width"
            disabled={
              Boolean(data.error) ||
              borrowedBooks.length === 0 ||
              data.members.length === 0
            }
          >
            Reserve Book
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Reservation Records</h2>

          <select
            className="loan-filter"
            aria-label="Filter reservations"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Cancelled">Cancelled</option>
            <option value="All">All Records</option>
          </select>
        </div>

        {visibleReservations.length === 0 ? (
          <div className="catalogue-empty">
            <CalendarClock size={36} />
            <h2>No reservations found</h2>
            <p>New reservations will appear here.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Book</th>
                  <th scope="col">Member</th>
                  <th scope="col">Reserved On</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleReservations.map((reservation) => {
                  const status = getStatus(reservation, data);

                  return (
                    <tr key={reservation.id}>
                      <td className="book-title">
                        {reservation.bookTitle}
                      </td>
                      <td>{reservation.memberName}</td>
                      <td className="member-date">
                        {new Date(
                          `${reservation.createdOn}T00:00:00`,
                        ).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            status === 'Ready'
                              ? 'badge-green'
                              : status === 'Waiting'
                                ? 'badge-amber'
                                : 'badge-grey'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        {!reservation.cancelled ? (
                          <button
                            className="danger-button"
                            onClick={() =>
                              cancelReservation(reservation.id)
                            }
                          >
                            Cancel
                          </button>
                        ) : (
                          '—'
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

export default ReservationsPage;