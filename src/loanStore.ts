export type Loan = {
  id: string;
  bookId: string;
  memberId: string;
  bookTitle: string;
  memberName: string;
  issuedOn: string;
  dueOn: string;
  returnedOn: string | null;
};

const STORAGE_KEY = 'booknest-loans-v1';

function isLoan(value: unknown): value is Loan {
  if (typeof value !== 'object' || value === null) return false;

  const loan = value as Record<string, unknown>;

  return (
    typeof loan.id === 'string' &&
    typeof loan.bookId === 'string' &&
    typeof loan.memberId === 'string' &&
    typeof loan.bookTitle === 'string' &&
    typeof loan.memberName === 'string' &&
    typeof loan.issuedOn === 'string' &&
    typeof loan.dueOn === 'string' &&
    (loan.returnedOn === null || typeof loan.returnedOn === 'string')
  );
}

export function readLoans(): Loan[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved === null) return [];

  const parsed: unknown = JSON.parse(saved);

  if (!Array.isArray(parsed) || !parsed.every(isLoan)) {
    throw new Error('Saved loan records could not be read.');
  }

  return parsed;
}

export function saveLoans(loans: Loan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
}

export function todayDate(): string {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}