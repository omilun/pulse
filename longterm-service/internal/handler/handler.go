package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/omilun/pulse/longterm-service/internal/model"
	"github.com/omilun/pulse/longterm-service/internal/store"
)

type Handler struct{ store *store.Store }

func New(s *store.Store) *Handler { return &Handler{store: s} }

func userID(r *http.Request) string {
	return r.Header.Get("X-User-ID")
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

// ─── Goals ────────────────────────────────────────────────────────────────────

func (h *Handler) ListGoals(w http.ResponseWriter, r *http.Request) {
	goals, err := h.store.ListGoals(r.Context(), userID(r))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, goals)
}

func (h *Handler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	var body model.Goal
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		http.Error(w, "invalid request", 400)
		return
	}
	goal, err := h.store.CreateGoal(r.Context(), userID(r), body.Title, body.Description, &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 201, goal)
}

func (h *Handler) GetGoal(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.PathValue("id"), "")
	goal, err := h.store.GetGoal(r.Context(), id, userID(r))
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, goal)
}

func (h *Handler) UpdateGoal(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body model.Goal
	json.NewDecoder(r.Body).Decode(&body)
	goal, err := h.store.UpdateGoal(r.Context(), id, userID(r), &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, goal)
}

func (h *Handler) DeleteGoal(w http.ResponseWriter, r *http.Request) {
	h.store.DeleteGoal(r.Context(), r.PathValue("id"), userID(r))
	w.WriteHeader(204)
}

// ─── Stories ──────────────────────────────────────────────────────────────────

func (h *Handler) ListStories(w http.ResponseWriter, r *http.Request) {
	stories, err := h.store.ListStories(r.Context(), userID(r), r.PathValue("goalId"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, stories)
}

func (h *Handler) CreateStory(w http.ResponseWriter, r *http.Request) {
	var body model.Story
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		http.Error(w, "invalid request", 400)
		return
	}
	story, err := h.store.CreateStory(r.Context(), userID(r), r.PathValue("goalId"), body.Title, body.Description, &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 201, story)
}

func (h *Handler) GetStory(w http.ResponseWriter, r *http.Request) {
	story, err := h.store.GetStory(r.Context(), r.PathValue("id"), userID(r))
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, story)
}

func (h *Handler) UpdateStory(w http.ResponseWriter, r *http.Request) {
	var body model.Story
	json.NewDecoder(r.Body).Decode(&body)
	story, err := h.store.UpdateStory(r.Context(), r.PathValue("id"), userID(r), &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, story)
}

func (h *Handler) DeleteStory(w http.ResponseWriter, r *http.Request) {
	h.store.DeleteStory(r.Context(), r.PathValue("id"), userID(r))
	w.WriteHeader(204)
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := h.store.ListTasks(r.Context(), userID(r), r.PathValue("storyId"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, tasks)
}

func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	var body model.Task
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		http.Error(w, "invalid request", 400)
		return
	}
	task, err := h.store.CreateTask(r.Context(), userID(r), r.PathValue("storyId"), body.Title, body.Description, &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 201, task)
}

func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
	task, err := h.store.GetTask(r.Context(), r.PathValue("id"), userID(r))
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	writeJSON(w, 200, task)
}

func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	var body model.Task
	json.NewDecoder(r.Body).Decode(&body)
	task, err := h.store.UpdateTask(r.Context(), r.PathValue("id"), userID(r), &body)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, task)
}

func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	h.store.DeleteTask(r.Context(), r.PathValue("id"), userID(r))
	w.WriteHeader(204)
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

func (h *Handler) GetTimeline(w http.ResponseWriter, r *http.Request) {
	items, err := h.store.GetTimeline(r.Context(), userID(r))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, items)
}
