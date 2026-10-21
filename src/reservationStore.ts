export type Reservation = {
  id: string;
  bookId: string;
  memberId: string;
  bookTitle: string;
  memberName: string;
  createdOn: string;
  cancelled: boolean;
};

export const RESERVATIONS_KEY = 'booknest-reservations-v1';

function isReservation(value: unknown): value is Reservation {
  if (typeof value !== 'object' || value === null) return false;

  const reservation = value as Record<string, unknown>;

  return (
    typeof reservation.id === 'string' &&
    typeof reservation.bookId === 'string' &&
    typeof reservation.memberId === 'string' &&
    typeof reservation.bookTitle === 'string' &&
    typeof reservation.memberName === 'string' &&
    typeof reservation.createdOn === 'string' &&
    typeof reservation.cancelled === 'boolean'
  );
}

export function readReservations(): Reservation[] {
  const saved = localStorage.getItem(RESERVATIONS_KEY);

  if (saved === null) return [];

  const parsed: unknown = JSON.parse(saved);

  if (!Array.isArray(parsed) || !parsed.every(isReservation)) {
    throw new Error('Saved reservations could not be read.');
  }

  return parsed;
}