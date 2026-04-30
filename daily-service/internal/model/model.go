package model

import "time"

type Frequency string

const (
	FreqDaily    Frequency = "daily"
	FreqWeekdays Frequency = "weekdays"
	FreqWeekly   Frequency = "weekly"
)

type Status string

const (
	StatusBacklog    Status = "backlog"
	StatusScheduled  Status = "scheduled"
	StatusDone       Status = "done"
)

// Commitment is a recurring habit/routine created once by the user.
// The system auto-generates a DailyEntry for each applicable day.
type Commitment struct {
	ID          string    `json:"id"`          // COMM-001
	UserID      string    `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Frequency   Frequency `json:"frequency"`   // daily | weekdays | weekly
	TimeOfDay   string    `json:"time_of_day"` // "07:30" optional
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
}

// DailyEntry is one instance of a commitment on a specific date.
type DailyEntry struct {
	ID           int64     `json:"id"`
	UserID       string    `json:"user_id"`
	CommitmentID string    `json:"commitment_id"`
	Date         string    `json:"date"` // YYYY-MM-DD
	Done         bool      `json:"done"`
	CreatedAt    time.Time `json:"created_at"`
	// Joined fields
	Title       string `json:"title,omitempty"`
	TimeOfDay   string `json:"time_of_day,omitempty"`
}

// OneTimeTask is a single task with a scheduled date.
type OneTimeTask struct {
	ID          string     `json:"id"`          // OT-001
	UserID      string     `json:"user_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      Status     `json:"status"`
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// WeekDay aggregates entries + tasks for a single day in the weekly view.
type WeekDay struct {
	Date        string       `json:"date"`
	Commitments []DailyEntry `json:"commitments"`
	Tasks       []OneTimeTask `json:"tasks"`
}
