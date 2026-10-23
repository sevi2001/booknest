CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY,
    title VARCHAR(150) NOT NULL CHECK (length(trim(title)) > 0),
    author VARCHAR(150) NOT NULL CHECK (length(trim(author)) > 0),
    category VARCHAR(40) NOT NULL CHECK (
        category IN (
            'Self Development',
            'Technology',
            'Finance',
            'Fiction'
        )
    ),
    isbn VARCHAR(13) NOT NULL UNIQUE CHECK (
        isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'
    ),
    available BOOLEAN NOT NULL DEFAULT TRUE,
    color VARCHAR(7) NOT NULL DEFAULT '#dbeafe' CHECK (
        color ~ '^#[0-9A-Fa-f]{6}$'
    ),
    image_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);