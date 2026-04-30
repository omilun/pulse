package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/XSAM/otelsql"
	_ "github.com/lib/pq"
	"github.com/omilun/pulse/daily-service/internal/model"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

type Store struct{ db *sql.DB }

func New(dsn string) (*Store, error) {
	db, err := otelsql.Open("postgres", dsn,
		otelsql.WithAttributes(semconv.DBSystemPostgreSQL),
		otelsql.WithSpanOptions(otelsql.SpanOptions{Ping: true}),
	)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	if err := otelsql.RegisterDBStatsMetrics(db, otelsql.WithAttributes(semconv.DBSystemPostgreSQL)); err != nil {
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() { s.db.Close() }

func (s *Store) Migrate() error {
	_, err := s.db.Exec(`
		CREATE SEQUENCE IF NOT EXISTS comm_seq;
		CREATE SEQUENCE IF NOT EXISTS ot_seq;

		CREATE TABLE IF NOT EXISTS commitments (
			id          TEXT PRIMARY KEY,
			user_id     TEXT NOT NULL,
			title       TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			frequency   TEXT NOT NULL DEFAULT 'daily',
			time_of_day TEXT NOT NULL DEFAULT '',
			active      BOOLEAN NOT NULL DEFAULT TRUE,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS daily_entries (
			id            BIGSERIAL PRIMARY KEY,
			user_id       TEXT NOT NULL,
			commitment_id TEXT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
			date          DATE NOT NULL,
			done          BOOLEAN NOT NULL DEFAULT FALSE,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(commitment_id, date)
		);

		CREATE TABLE IF NOT EXISTS one_time_tasks (
			id           TEXT PRIMARY KEY,
			user_id      TEXT NOT NULL,
			title        TEXT NOT NULL,
			description  TEXT NOT NULL DEFAULT '',
			status       TEXT NOT NULL DEFAULT 'backlog',
			scheduled_at TIMESTAMPTZ,
			created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	return err
}

func nextID(db *sql.DB, seq, prefix string) (string, error) {
	var n int64
	if err := db.QueryRow(fmt.Sprintf("SELECT nextval('%s')", seq)).Scan(&n); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s-%03d", prefix, n), nil
}

// ─── Commitments ─────────────────────────────────────────────────────────────

func (s *Store) CreateCommitment(ctx context.Context, userID string, c *model.Commitment) (*model.Commitment, error) {
	id, err := nextID(s.db, "comm_seq", "COMM")
	if err != nil {
		return nil, err
	}
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO commitments (id,user_id,title,description,frequency,time_of_day) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, userID, c.Title, c.Description, c.Frequency, c.TimeOfDay)
	if err != nil {
		return nil, err
	}
	return s.GetCommitment(ctx, id, userID)
}

func (s *Store) ListCommitments(ctx context.Context, userID string) ([]model.Commitment, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id,user_id,title,description,frequency,time_of_day,active,created_at FROM commitments WHERE user_id=$1 ORDER BY created_at DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.Commitment
	for rows.Next() {
		var c model.Commitment
		rows.Scan(&c.ID, &c.UserID, &c.Title, &c.Description, &c.Frequency, &c.TimeOfDay, &c.Active, &c.CreatedAt)
		out = append(out, c)
	}
	if out == nil {
		out = []model.Commitment{}
	}
	return out, rows.Err()
}

func (s *Store) GetCommitment(ctx context.Context, id, userID string) (*model.Commitment, error) {
	var c model.Commitment
	err := s.db.QueryRowContext(ctx,
		`SELECT id,user_id,title,description,frequency,time_of_day,active,created_at FROM commitments WHERE id=$1 AND user_id=$2`,
		id, userID).Scan(&c.ID, &c.UserID, &c.Title, &c.Description, &c.Frequency, &c.TimeOfDay, &c.Active, &c.CreatedAt)
	return &c, err
}

func (s *Store) UpdateCommitment(ctx context.Context, id, userID string, c *model.Commitment) (*model.Commitment, error) {
	_, err := s.db.ExecContext(ctx,
		`UPDATE commitments SET title=$3,description=$4,frequency=$5,time_of_day=$6,active=$7 WHERE id=$1 AND user_id=$2`,
		id, userID, c.Title, c.Description, c.Frequency, c.TimeOfDay, c.Active)
	if err != nil {
		return nil, err
	}
	return s.GetCommitment(ctx, id, userID)
}

func (s *Store) DeleteCommitment(ctx context.Context, id, userID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM commitments WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

// ─── Daily Entries ────────────────────────────────────────────────────────────

// EnsureEntries ensures daily_entries rows exist for a commitment for the given date range.
func (s *Store) EnsureEntries(ctx context.Context, userID string, from, to time.Time) error {
	comms, err := s.ListCommitments(ctx, userID)
	if err != nil {
		return err
	}
	for _, c := range comms {
		if !c.Active {
			continue
		}
		for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
			wd := d.Weekday()
			switch c.Frequency {
			case model.FreqWeekdays:
				if wd == time.Saturday || wd == time.Sunday {
					continue
				}
			case model.FreqWeekly:
				// Use day-of-week from commitment creation day
				if wd != c.CreatedAt.Weekday() {
					continue
				}
			}
			dateStr := d.Format("2006-01-02")
			s.db.ExecContext(ctx,
				`INSERT INTO daily_entries (user_id,commitment_id,date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
				userID, c.ID, dateStr)
		}
	}
	return nil
}

func (s *Store) MarkEntryDone(ctx context.Context, id int64, done bool, userID string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE daily_entries SET done=$3 WHERE id=$1 AND user_id=$2`, id, userID, done)
	return err
}

// ─── One-time Tasks ───────────────────────────────────────────────────────────

func (s *Store) CreateTask(ctx context.Context, userID string, t *model.OneTimeTask) (*model.OneTimeTask, error) {
	id, err := nextID(s.db, "ot_seq", "OT")
	if err != nil {
		return nil, err
	}
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO one_time_tasks (id,user_id,title,description,scheduled_at) VALUES ($1,$2,$3,$4,$5)`,
		id, userID, t.Title, t.Description, t.ScheduledAt)
	if err != nil {
		return nil, err
	}
	return s.GetTask(ctx, id, userID)
}

func (s *Store) ListTasks(ctx context.Context, userID string) ([]model.OneTimeTask, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id,user_id,title,description,status,scheduled_at,created_at FROM one_time_tasks WHERE user_id=$1 ORDER BY COALESCE(scheduled_at,created_at) ASC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []model.OneTimeTask
	for rows.Next() {
		var t model.OneTimeTask
		rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Description, &t.Status, &t.ScheduledAt, &t.CreatedAt)
		out = append(out, t)
	}
	if out == nil {
		out = []model.OneTimeTask{}
	}
	return out, rows.Err()
}

func (s *Store) GetTask(ctx context.Context, id, userID string) (*model.OneTimeTask, error) {
	var t model.OneTimeTask
	err := s.db.QueryRowContext(ctx,
		`SELECT id,user_id,title,description,status,scheduled_at,created_at FROM one_time_tasks WHERE id=$1 AND user_id=$2`,
		id, userID).Scan(&t.ID, &t.UserID, &t.Title, &t.Description, &t.Status, &t.ScheduledAt, &t.CreatedAt)
	return &t, err
}

func (s *Store) UpdateTask(ctx context.Context, id, userID string, t *model.OneTimeTask) (*model.OneTimeTask, error) {
	_, err := s.db.ExecContext(ctx,
		`UPDATE one_time_tasks SET title=$3,description=$4,status=$5,scheduled_at=$6 WHERE id=$1 AND user_id=$2`,
		id, userID, t.Title, t.Description, t.Status, t.ScheduledAt)
	if err != nil {
		return nil, err
	}
	return s.GetTask(ctx, id, userID)
}

func (s *Store) DeleteTask(ctx context.Context, id, userID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM one_time_tasks WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

// ─── Weekly View ──────────────────────────────────────────────────────────────

func (s *Store) GetWeek(ctx context.Context, userID string, from, to time.Time) ([]model.WeekDay, error) {
	// Ensure entries are generated for the week
	s.EnsureEntries(ctx, userID, from, to)

	// Load all entries for the week
	entryRows, err := s.db.QueryContext(ctx, `
		SELECT e.id, e.user_id, e.commitment_id, to_char(e.date,'YYYY-MM-DD'), e.done, e.created_at,
		       c.title, c.time_of_day
		FROM daily_entries e
		JOIN commitments c ON c.id = e.commitment_id
		WHERE e.user_id=$1 AND e.date BETWEEN $2 AND $3
		ORDER BY e.date, c.time_of_day`,
		userID, from.Format("2006-01-02"), to.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	defer entryRows.Close()

	entriesByDate := map[string][]model.DailyEntry{}
	for entryRows.Next() {
		var e model.DailyEntry
		entryRows.Scan(&e.ID, &e.UserID, &e.CommitmentID, &e.Date, &e.Done, &e.CreatedAt, &e.Title, &e.TimeOfDay)
		entriesByDate[e.Date] = append(entriesByDate[e.Date], e)
	}

	// Load one-time tasks for the week
	taskRows, err := s.db.QueryContext(ctx, `
		SELECT id,user_id,title,description,status,scheduled_at,created_at
		FROM one_time_tasks
		WHERE user_id=$1 AND scheduled_at BETWEEN $2 AND $3
		ORDER BY scheduled_at`,
		userID, from, to.Add(24*time.Hour))
	if err != nil {
		return nil, err
	}
	defer taskRows.Close()

	tasksByDate := map[string][]model.OneTimeTask{}
	for taskRows.Next() {
		var t model.OneTimeTask
		taskRows.Scan(&t.ID, &t.UserID, &t.Title, &t.Description, &t.Status, &t.ScheduledAt, &t.CreatedAt)
		if t.ScheduledAt != nil {
			d := t.ScheduledAt.Format("2006-01-02")
			tasksByDate[d] = append(tasksByDate[d], t)
		}
	}

	// Build week
	var week []model.WeekDay
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		entries := entriesByDate[dateStr]
		tasks := tasksByDate[dateStr]
		if entries == nil {
			entries = []model.DailyEntry{}
		}
		if tasks == nil {
			tasks = []model.OneTimeTask{}
		}
		week = append(week, model.WeekDay{Date: dateStr, Commitments: entries, Tasks: tasks})
	}
	return week, nil
}
