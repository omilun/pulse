package store

import (
	"context"
	"database/sql"
	"time"

	_ "github.com/lib/pq"
)

type Store struct {
	db *sql.DB
}

type Entry struct {
	ID        int64     `json:"id"`
	Content   string    `json:"content"`
	Category  string    `json:"category"`
	CreatedAt time.Time `json:"created_at"`
}

func New(dsn string) (*Store, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() { s.db.Close() }

func (s *Store) Migrate() error {
	_, err := s.db.Exec(`
CREATE TABLE IF NOT EXISTS entries (
	id         BIGSERIAL   PRIMARY KEY,
	content    TEXT        NOT NULL,
	category   TEXT        NOT NULL DEFAULT 'general',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
	return err
}

func (s *Store) ListEntries(ctx context.Context) ([]Entry, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, content, category, created_at FROM entries ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []Entry
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.Content, &e.Category, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (s *Store) CreateEntry(ctx context.Context, content, category string) (Entry, error) {
	var e Entry
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO entries (content, category) VALUES ($1, $2)
RETURNING id, content, category, created_at`,
		content, category,
	).Scan(&e.ID, &e.Content, &e.Category, &e.CreatedAt)
	return e, err
}

func (s *Store) DeleteEntry(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM entries WHERE id = $1`, id)
	return err
}
