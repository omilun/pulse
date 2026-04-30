package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/omilun/pulse/daily-service/internal/model"
	"github.com/omilun/pulse/daily-service/internal/store"
)

type Handler struct{ store *store.Store }

func New(s *store.Store) *Handler { return &Handler{store: s} }

func userID(r *http.Request) string { return r.Header.Get("X-User-ID") }

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

// ─── Commitments ─────────────────────────────────────────────────────────────

func (h *Handler) ListCommitments(w http.ResponseWriter, r *http.Request) {
	out, err := h.store.ListCommitments(r.Context(), userID(r))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, out)
}

func (h *Handler) CreateCommitment(w http.ResponseWriter, r *http.Request) {
	var body model.Commitment
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		http.Error(w, "invalid request", 400)
		return
	}
	if body.Frequency == "" {
		body.Frequency = model.FreqDaily
	}
	c, err := h.store.CreateCommitment(r.Context(), userID(r), &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 201, c)
}

func (h *Handler) UpdateCommitment(w http.ResponseWriter, r *http.Request) {
	var body model.Commitment
	json.NewDecoder(r.Body).Decode(&body)
	c, err := h.store.UpdateCommitment(r.Context(), r.PathValue("id"), userID(r), &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, c)
}

func (h *Handler) DeleteCommitment(w http.ResponseWriter, r *http.Request) {
	h.store.DeleteCommitment(r.Context(), r.PathValue("id"), userID(r))
	w.WriteHeader(204)
}

// ─── Daily Entry check-off ────────────────────────────────────────────────────

func (h *Handler) MarkEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", 400)
		return
	}
	var body struct {
		Done bool `json:"done"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if err := h.store.MarkEntryDone(r.Context(), id, body.Done, userID(r)); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(204)
}

// ─── One-time Tasks ───────────────────────────────────────────────────────────

func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := h.store.ListTasks(r.Context(), userID(r))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, tasks)
}

func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	var body model.OneTimeTask
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		http.Error(w, "invalid request", 400)
		return
	}
	t, err := h.store.CreateTask(r.Context(), userID(r), &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 201, t)
}

func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	var body model.OneTimeTask
	json.NewDecoder(r.Body).Decode(&body)
	t, err := h.store.UpdateTask(r.Context(), r.PathValue("id"), userID(r), &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, t)
}

func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	h.store.DeleteTask(r.Context(), r.PathValue("id"), userID(r))
	w.WriteHeader(204)
}

// ─── Weekly View ──────────────────────────────────────────────────────────────

func (h *Handler) GetWeek(w http.ResponseWriter, r *http.Request) {
	dateStr := r.URL.Query().Get("date")
	var anchor time.Time
	if dateStr == "" {
		anchor = time.Now()
	} else {
		var err error
		anchor, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			http.Error(w, "invalid date (use YYYY-MM-DD)", 400)
			return
		}
	}
	// Start of week (Monday)
	wd := int(anchor.Weekday())
	if wd == 0 {
		wd = 7
	}
	from := anchor.AddDate(0, 0, -(wd - 1)).Truncate(24 * time.Hour)
	to := from.AddDate(0, 0, 6)

	week, err := h.store.GetWeek(r.Context(), userID(r), from, to)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, week)
}
