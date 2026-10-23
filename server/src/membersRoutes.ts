import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { pool } from './db.js';

const router = Router();

type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: Date;
};

type MemberInput = {
  name: string;
  email: string;
  phone: string;
};

const memberColumns = `
  id,
  name,
  email,
  phone,
  joined_at AS "joinedAt"
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function validateMember(value: unknown): MemberInput {
  if (!isRecord(value)) {
    throw new Error('Enter valid member details.');
  }

  const name =
    typeof value.name === 'string' ? value.name.trim() : '';

  const email =
    typeof value.email === 'string'
      ? value.email.trim().toLowerCase()
      : '';

  const phone =
    typeof value.phone === 'string' ? value.phone.trim() : '';

  if (!name || name.length > 100) {
    throw new Error('Enter a name between 1 and 100 characters.');
  }

  if (
    email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('Enter a valid email address.');
  }

  const digits = phone.replace(/\D/g, '');

  if (
    phone.length > 25 ||
    !/^\+?[\d\s()-]+$/.test(phone) ||
    digits.length < 7 ||
    digits.length > 15
  ) {
    throw new Error('Enter a valid phone number with 7 to 15 digits.');
  }

  return { name, email, phone };
}

// GET /api/members
router.get('/', async (_request, response) => {
  try {
    const result = await pool.query<MemberRow>(
      `SELECT ${memberColumns}
       FROM members
       ORDER BY joined_at DESC, id`,
    );

    response.json(result.rows);
  } catch (error) {
    console.error('Could not load members:', error);

    response.status(500).json({
      message: 'Could not load members.',
    });
  }
});

// POST /api/members
router.post('/', async (request, response) => {
  let member: MemberInput;

  try {
    member = validateMember(request.body);
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error ? error.message : 'Invalid member details.',
    });
    return;
  }

  try {
    const result = await pool.query<MemberRow>(
      `INSERT INTO members (id, name, email, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING ${memberColumns}`,
      [randomUUID(), member.name, member.email, member.phone],
    );

    response.status(201).json(result.rows[0]);
  } catch (error) {
    if (isRecord(error) && error.code === '23505') {
      response.status(409).json({
        message: 'A member with this email already exists.',
      });
      return;
    }

    console.error('Could not add member:', error);

    response.status(500).json({
      message: 'Could not save the member.',
    });
  }
});

// PUT /api/members/:id
router.put('/:id', async (request, response) => {
  const id = request.params.id;

  if (!isValidId(id)) {
    response.status(400).json({
      message: 'Invalid member ID.',
    });
    return;
  }

  let member: MemberInput;

  try {
    member = validateMember(request.body);
  } catch (error) {
    response.status(400).json({
      message:
        error instanceof Error ? error.message : 'Invalid member details.',
    });
    return;
  }

  try {
    const result = await pool.query<MemberRow>(
      `UPDATE members
       SET name = $1,
           email = $2,
           phone = $3
       WHERE id = $4
       RETURNING ${memberColumns}`,
      [member.name, member.email, member.phone, id],
    );

    if (result.rows.length === 0) {
      response.status(404).json({
        message: 'Member not found.',
      });
      return;
    }

    response.json(result.rows[0]);
  } catch (error) {
    if (isRecord(error) && error.code === '23505') {
      response.status(409).json({
        message: 'Another member already uses this email.',
      });
      return;
    }

    console.error('Could not update member:', error);

    response.status(500).json({
      message: 'Could not update the member.',
    });
  }
});

export default router;