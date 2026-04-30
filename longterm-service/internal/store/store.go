package store

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/XSAM/otelsql"
	_ "github.com/lib/pq"
	"github.com/omilun/pulse/longterm-service/internal/model"
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
	if _, err := otelsql.RegisterDBStatsMetrics(db, otelsql.WithAttributes(semconv.DBSystemPostgreSQL)); err != nil {
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() { s.db.Close() }

func (s *Store) Migrate() error {
	_, err := s.db.Exec(`
		CREATE SEQUENCE IF NOT EXISTS goal_seq;
		CREATE SEQUENCE IF NOT EXISTS story_seq;
		CREATE SEQUENCE IF NOT EXISTS task_seq;

		CREATE TABLE IF NOT EXISTS goals (
			id          TEXT PRIMARY KEY,
			user_id     TEXT NOT NULL,
			title       TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			status      TEXT NOT NULL DEFAULT 'backlog',
			start_date  TIMESTAMPTZ,
			due_date    TIMESTAMPTZ,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS stories (
			id          TEXT PRIMARY KEY,
			user_id     TEXT NOT NULL,
			goal_id     TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
			title       TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			status      TEXT NOT NULL DEFAULT 'backlog',
			start_date  TIMESTAMPTZ,
			due_date    TIMESTAMPTZ,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS tasks (
			id          TEXT PRIMARY KEY,
			user_id     TEXT NOT NULL,
			story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
			title       TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			status      TEXT NOT NULL DEFAULT 'backlog',
			start_date  TIMESTAMPTZ,
			due_date    TIMESTAMPTZ,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

// ─── Goals ────────────────────────────────────────────────────────────────────

func (s *Store) CreateGoal(ctx context.Context, userID, title, description string, g *model.Goal) (*model.Goal, error) {
	id, err := nextID(s.db, "goal_seq", "GOAL")
	if err != nil {
		return nil, err
	}
	q := `INSERT INTO goals (id, user_id, title, description, start_date, due_date)
	      VALUES ($1,$2,$3,$4,$5,$6) RETURNING status, created_at`
	goal := &model.Goal{ID: id, UserID: userID, Title: title, Description: description,
		StartDate: g.StartDate, DueDate: g.DueDate}
	err = s.db.QueryRowContext(ctx, q, id, userID, title, description, g.StartDate, g.DueDate).
		Scan(&goal.Status, &goal.CreatedAt)
	return goal, err
}

func (s *Store) ListGoals(ctx context.Context, userID string) ([]model.Goal, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id,user_id,title,description,status,start_date,due_date,created_at FROM goals WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var goals []model.Goal
	for rows.Next() {
		var g model.Goal
		rows.Scan(&g.ID, &g.UserID, &g.Title, &g.Description, &g.Status, &g.StartDate, &g.DueDate, &g.CreatedAt)
		goals = append(goals, g)
	}
	if goals == nil {
		goals = []model.Goal{}
	}
	return goals, rows.Err()
}

func (s *Store) GetGoal(ctx context.Context, id, userID string) (*model.Goal, error) {
	var g model.Goal
	err := s.db.QueryRowContext(ctx,
		`SELECT id,user_id,title,description,status,start_date,due_date,created_at FROM goals WHERE id=$1 AND user_id=$2`,
		id, userID).Scan(&g.ID, &g.UserID, &g.Title, &g.Description, &g.Status, &g.StartDate, &g.DueDate, &g.CreatedAt)
	return &g, err
}

func (s *Store) UpdateGoal(ctx context.Context, id, userID string, g *model.Goal) (*model.Goal, error) {
	_, err := s.db.ExecContext(ctx,
		`UPDATE goals SET title=$3, description=$4, status=$5, start_date=$6, due_date=$7 WHERE id=$1 AND user_id=$2`,
		id, userID, g.Title, g.Description, g.Status, g.StartDate, g.DueDate)
	if err != nil {
		return nil, err
	}
	return s.GetGoal(ctx, id, userID)
}

func (s *Store) DeleteGoal(ctx context.Context, id, userID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM goals WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

// ─── Stories ──────────────────────────────────────────────────────────────────

func (s *Store) CreateStory(ctx context.Context, userID, goalID, title, description string, st *model.Story) (*model.Story, error) {
	id, err := nextID(s.db, "story_seq", "STORY")
	if err != nil {
		return nil, err
	}
	q := `INSERT INTO stories (id,user_id,goal_id,title,description,start_date,due_date)
	      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING status, created_at`
	story := &model.Story{ID: id, UserID: userID, GoalID: goalID, Title: title, Description: description,
		StartDate: st.StartDate, DueDate: st.DueDate}
	err = s.db.QueryRowContext(ctx, q, id, userID, goalID, title, description, st.StartDate, st.DueDate).
		Scan(&story.Status, &story.CreatedAt)
	return story, err
}

func (s *Store) ListStories(ctx context.Context, userID, goalID string) ([]model.Story, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id,user_id,goal_id,title,description,status,start_date,due_date,created_at FROM stories WHERE user_id=$1 AND goal_id=$2 ORDER BY created_at DESC`,
		userID, goalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var stories []model.Story
	for rows.Next() {
		var st model.Story
		rows.Scan(&st.ID, &st.UserID, &st.GoalID, &st.Title, &st.Description, &st.Status, &st.StartDate, &st.DueDate, &st.CreatedAt)
		stories = append(stories, st)
	}
	if stories == nil {
		stories = []model.Story{}
	}
	return stories, rows.Err()
}

func (s *Store) GetStory(ctx context.Context, id, userID string) (*model.Story, error) {
	var st model.Story
	err := s.db.QueryRowContext(ctx,
		`SELECT id,user_id,goal_id,title,description,status,start_date,due_date,created_at FROM stories WHERE id=$1 AND user_id=$2`,
		id, userID).Scan(&st.ID, &st.UserID, &st.GoalID, &st.Title, &st.Description, &st.Status, &st.StartDate, &st.DueDate, &st.CreatedAt)
	return &st, err
}

func (s *Store) UpdateStory(ctx context.Context, id, userID string, st *model.Story) (*model.Story, error) {
	_, err := s.db.ExecContext(ctx,
		`UPDATE stories SET title=$3, description=$4, status=$5, start_date=$6, due_date=$7 WHERE id=$1 AND user_id=$2`,
		id, userID, st.Title, st.Description, st.Status, st.StartDate, st.DueDate)
	if err != nil {
		return nil, err
	}
	return s.GetStory(ctx, id, userID)
}

func (s *Store) DeleteStory(ctx context.Context, id, userID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM stories WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

func (s *Store) CreateTask(ctx context.Context, userID, storyID, title, description string, t *model.Task) (*model.Task, error) {
	id, err := nextID(s.db, "task_seq", "TASK")
	if err != nil {
		return nil, err
	}
	q := `INSERT INTO tasks (id,user_id,story_id,title,description,start_date,due_date)
	      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING status, created_at`
	task := &model.Task{ID: id, UserID: userID, StoryID: storyID, Title: title, Description: description,
		StartDate: t.StartDate, DueDate: t.DueDate}
	err = s.db.QueryRowContext(ctx, q, id, userID, storyID, title, description, t.StartDate, t.DueDate).
		Scan(&task.Status, &task.CreatedAt)
	return task, err
}

func (s *Store) ListTasks(ctx context.Context, userID, storyID string) ([]model.Task, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id,user_id,story_id,title,description,status,start_date,due_date,created_at FROM tasks WHERE user_id=$1 AND story_id=$2 ORDER BY created_at DESC`,
		userID, storyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tasks []model.Task
	for rows.Next() {
		var t model.Task
		rows.Scan(&t.ID, &t.UserID, &t.StoryID, &t.Title, &t.Description, &t.Status, &t.StartDate, &t.DueDate, &t.CreatedAt)
		tasks = append(tasks, t)
	}
	if tasks == nil {
		tasks = []model.Task{}
	}
	return tasks, rows.Err()
}

func (s *Store) GetTask(ctx context.Context, id, userID string) (*model.Task, error) {
	var t model.Task
	err := s.db.QueryRowContext(ctx,
		`SELECT id,user_id,story_id,title,description,status,start_date,due_date,created_at FROM tasks WHERE id=$1 AND user_id=$2`,
		id, userID).Scan(&t.ID, &t.UserID, &t.StoryID, &t.Title, &t.Description, &t.Status, &t.StartDate, &t.DueDate, &t.CreatedAt)
	return &t, err
}

func (s *Store) UpdateTask(ctx context.Context, id, userID string, t *model.Task) (*model.Task, error) {
	_, err := s.db.ExecContext(ctx,
		`UPDATE tasks SET title=$3, description=$4, status=$5, start_date=$6, due_date=$7 WHERE id=$1 AND user_id=$2`,
		id, userID, t.Title, t.Description, t.Status, t.StartDate, t.DueDate)
	if err != nil {
		return nil, err
	}
	return s.GetTask(ctx, id, userID)
}

func (s *Store) DeleteTask(ctx context.Context, id, userID string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM tasks WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

type TimelineItem struct {
	ID        string     `json:"id"`
	Type      string     `json:"type"` // goal | story | task
	Title     string     `json:"title"`
	Status    string     `json:"status"`
	StartDate *string    `json:"start_date,omitempty"`
	DueDate   *string    `json:"due_date,omitempty"`
	ParentID  *string    `json:"parent_id,omitempty"`
}

func (s *Store) GetTimeline(ctx context.Context, userID string) ([]TimelineItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, 'goal' as type, title, status,
		       to_char(start_date,'YYYY-MM-DD'), to_char(due_date,'YYYY-MM-DD'), NULL
		FROM goals WHERE user_id=$1 AND (start_date IS NOT NULL OR due_date IS NOT NULL)
		UNION ALL
		SELECT id, 'story', title, status,
		       to_char(start_date,'YYYY-MM-DD'), to_char(due_date,'YYYY-MM-DD'), goal_id
		FROM stories WHERE user_id=$1 AND (start_date IS NOT NULL OR due_date IS NOT NULL)
		UNION ALL
		SELECT id, 'task', title, status,
		       to_char(start_date,'YYYY-MM-DD'), to_char(due_date,'YYYY-MM-DD'), story_id
		FROM tasks WHERE user_id=$1 AND (start_date IS NOT NULL OR due_date IS NOT NULL)
		ORDER BY 5 NULLS LAST, 6 NULLS LAST
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []TimelineItem
	for rows.Next() {
		var it TimelineItem
		rows.Scan(&it.ID, &it.Type, &it.Title, &it.Status, &it.StartDate, &it.DueDate, &it.ParentID)
		items = append(items, it)
	}
	if items == nil {
		items = []TimelineItem{}
	}
	return items, rows.Err()
}
