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

type BookRow = {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  available: boolean;
  color: string;
  imageUrl: string;
};

const bookColumns = `
  id,
  title,
  author,
  category,
  isbn,
  available,
  color,
  image_url AS "imageUrl"
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// GET /api/books
router.get('/', async (_request, response) => {
  try {
    const result = await pool.query<BookRow>(
      `SELECT ${bookColumns}
       FROM books
       ORDER BY created_at DESC, id`,
    );

    response.json(result.rows);
  } catch (error) {
    console.error(
      'Could not fetch books:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    response.status(500).json({
      message: 'Could not load books.',
    });
  }
});

// POST /api/books
router.post('/', async (request, response) => {
  const body: unknown = request.body;

  if (!isRecord(body)) {
    response.status(400).json({
      message: 'Enter valid book details.',
    });
    return;
  }

  const title =
    typeof body.title === 'string' ? body.title.trim() : '';

  const author =
    typeof body.author === 'string' ? body.author.trim() : '';

  const category =
    typeof body.category === 'string' ? body.category : '';

  const isbn =
    typeof body.isbn === 'string'
      ? body.isbn.replace(/[\s-]/g, '').toUpperCase()
      : '';

  const color =
    body.color === undefined ? '#dbeafe' : body.color;

  const imageUrl =
    body.imageUrl === undefined
      ? ''
      : typeof body.imageUrl === 'string'
        ? body.imageUrl.trim()
        : null;

  if (!title || title.length > 150) {
    response.status(400).json({
      message: 'Enter a title between 1 and 150 characters.',
    });
    return;
  }

  if (!author || author.length > 150) {
    response.status(400).json({
      message: 'Enter an author between 1 and 150 characters.',
    });
    return;
  }

  if (!categories.includes(category)) {
    response.status(400).json({
      message: 'Choose a valid category.',
    });
    return;
  }

  if (!/^(?:\d{9}[\dX]|\d{13})$/.test(isbn)) {
    response.status(400).json({
      message: 'Enter a 10-character or 13-digit ISBN.',
    });
    return;
  }

  if (
    typeof color !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(color)
  ) {
    response.status(400).json({
      message: 'Choose a valid cover colour.',
    });
    return;
  }

  if (
    imageUrl === null ||
    imageUrl.length > 500 ||
    (imageUrl !== '' &&
      !/^\/books\/[^?#\\]+\.(?:jpg|jpeg|png|webp)$/i.test(imageUrl))
  ) {
    response.status(400).json({
      message:
        'Use an image path such as /books/deep-work.jpg, or leave it empty.',
    });
    return;
  }

  try {
    const result = await pool.query<BookRow>(
      `INSERT INTO books (
        id,
        title,
        author,
        category,
        isbn,
        color,
        image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${bookColumns}`,
      [
        randomUUID(),
        title,
        author,
        category,
        isbn,
        color,
        imageUrl,
      ],
    );

    response.status(201).json(result.rows[0]);
  } catch (error) {
    if (
      isRecord(error) &&
      error.code === '23505'
    ) {
      response.status(409).json({
        message: 'A book with this ISBN already exists.',
      });
      return;
    }

    console.error(
      'Could not add book:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    response.status(500).json({
      message: 'Could not save the book.',
    });
  }
});

// PUT /api/books/:id
router.put('/:id', async (request, response) => {
  const id = request.params.id;

  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    response.status(400).json({
      message: 'Invalid book ID.',
    });
    return;
  }

  const body: unknown = request.body;

  if (!isRecord(body)) {
    response.status(400).json({
      message: 'Enter valid book details.',
    });
    return;
  }

  const title =
    typeof body.title === 'string' ? body.title.trim() : '';

  const author =
    typeof body.author === 'string' ? body.author.trim() : '';

  const category =
    typeof body.category === 'string' ? body.category : '';

  const isbn =
    typeof body.isbn === 'string'
      ? body.isbn.replace(/[\s-]/g, '').toUpperCase()
      : '';

  const color = body.color;

  const imageUrl =
    body.imageUrl === undefined
      ? ''
      : typeof body.imageUrl === 'string'
        ? body.imageUrl.trim()
        : null;

  if (!title || title.length > 150) {
    response.status(400).json({
      message: 'Enter a title between 1 and 150 characters.',
    });
    return;
  }

  if (!author || author.length > 150) {
    response.status(400).json({
      message: 'Enter an author between 1 and 150 characters.',
    });
    return;
  }

  if (!categories.includes(category)) {
    response.status(400).json({
      message: 'Choose a valid category.',
    });
    return;
  }

  if (!/^(?:\d{9}[\dX]|\d{13})$/.test(isbn)) {
    response.status(400).json({
      message: 'Enter a 10-character or 13-digit ISBN.',
    });
    return;
  }

  if (
    typeof color !== 'string' ||
    !/^#[0-9a-f]{6}$/i.test(color)
  ) {
    response.status(400).json({
      message: 'Choose a valid cover colour.',
    });
    return;
  }

  if (
    imageUrl === null ||
    imageUrl.length > 500 ||
    (imageUrl !== '' &&
      !/^\/books\/[^?#\\]+\.(?:jpg|jpeg|png|webp)$/i.test(imageUrl))
  ) {
    response.status(400).json({
      message:
        'Use an image path such as /books/deep-work.jpg, or leave it empty.',
    });
    return;
  }

  try {
    const result = await pool.query<BookRow>(
      `UPDATE books
       SET title = $1,
           author = $2,
           category = $3,
           isbn = $4,
           color = $5,
           image_url = $6
       WHERE id = $7
       RETURNING ${bookColumns}`,
      [title, author, category, isbn, color, imageUrl, id],
    );

    if (result.rows.length === 0) {
      response.status(404).json({
        message: 'Book not found.',
      });
      return;
    }

    response.json(result.rows[0]);
  } catch (error) {
    if (isRecord(error) && error.code === '23505') {
      response.status(409).json({
        message: 'Another book already uses this ISBN.',
      });
      return;
    }

    console.error(
      'Could not update book:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    response.status(500).json({
      message: 'Could not update the book.',
    });
  }
});

// DELETE /api/books/:id
router.delete('/:id', async (request, response) => {
  const id = request.params.id;

  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    response.status(400).json({
      message: 'Invalid book ID.',
    });
    return;
  }

  try {
    // Only delete books marked available in PostgreSQL.
    const result = await pool.query(
      `DELETE FROM books
       WHERE id = $1 AND available = TRUE
       RETURNING id`,
      [id],
    );

    if (result.rowCount === 0) {
      const existing = await pool.query(
        'SELECT id FROM books WHERE id = $1',
        [id],
      );

      if (existing.rows.length === 0) {
        response.status(404).json({
          message: 'Book not found.',
        });
      } else {
        response.status(409).json({
          message: 'Return this borrowed book before deleting it.',
        });
      }

      return;
    }

    response.json({
      message: 'Book deleted successfully.',
    });
  } catch (error) {
    console.error(
      'Could not delete book:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    response.status(500).json({
      message: 'Could not delete the book.',
    });
  }
});

export default router;