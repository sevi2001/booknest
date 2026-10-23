import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { pool } from './db.js';

const router = Router();

const categories = [
  'Self Development',
  'Technology',
  'Finance',
  'Fiction',
];

type ImportBook = {
  title: string;
  author: string;
  category: string;
  isbn: string;
  color: string;
  imageUrl: string;
};

function validateBook(value: unknown): ImportBook {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid book record.');
  }

  const book = value as Record<string, unknown>;

  const title =
    typeof book.title === 'string' ? book.title.trim() : '';

  const author =
    typeof book.author === 'string' ? book.author.trim() : '';

  const category =
    typeof book.category === 'string' ? book.category : '';

  const isbn =
    typeof book.isbn === 'string'
      ? book.isbn.replace(/[\s-]/g, '').toUpperCase()
      : '';

  const color = book.color ?? '#dbeafe';
  const imageUrl = book.imageUrl ?? '';

  if (!title || title.length > 150) {
    throw new Error('A book has a missing or invalid title.');
  }

  if (!author || author.length > 150) {
    throw new Error(`Check the author for "${title}".`);
  }

  if (!categories.includes(category)) {
    throw new Error(`Check the category for "${title}".`);
  }

  if (!/^(?:\d{9}[\dX]|\d{13})$/.test(isbn)) {
    throw new Error(`Check the ISBN for "${title}".`);
  }

  if (
    typeof color !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(color)
  ) {
    throw new Error(`Check the cover colour for "${title}".`);
  }

  if (
    typeof imageUrl !== 'string' ||
    imageUrl.length > 500 ||
    (imageUrl !== '' &&
      !/^\/books\/[^?#\\]+\.(?:jpg|jpeg|png|webp)$/i.test(imageUrl))
  ) {
    throw new Error(
      `Check the image path for "${title}". Use /books/filename.jpg, .jpeg, .png or .webp.`,
    );
  }

  return {
    title,
    author,
    category,
    isbn,
    color,
    imageUrl: imageUrl.trim(),
  };
}

router.post('/', async (request, response) => {
  const body: unknown = request.body;

  if (!Array.isArray(body) || body.length === 0 || body.length > 1000) {
    response.status(400).json({
      message: 'Send between 1 and 1,000 books.',
    });
    return;
  }

  let books: ImportBook[];

  try {
    books = body.map(validateBook);
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error ? error.message : 'Invalid book data.',
    });
    return;
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let imported = 0;

      for (const book of books) {
        const result = await client.query(
          `INSERT INTO books (
            id, title, author, category, isbn,
            available, color, image_url
          )
          VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7)
          ON CONFLICT (isbn) DO NOTHING
          RETURNING id`,
          [
            randomUUID(),
            book.title,
            book.author,
            book.category,
            book.isbn,
            book.color,
            book.imageUrl,
          ],
        );

        imported += result.rowCount ?? 0;
      }

      await client.query('COMMIT');

      response.json({
        message: 'Import completed.',
        imported,
        skipped: books.length - imported,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      'Book import failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    response.status(500).json({
      message: 'Import failed. Please check the backend terminal.',
    });
  }
});

export default router;