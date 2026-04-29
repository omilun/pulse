package handler

import (
"encoding/json"
"net/http"
"strconv"

"github.com/omilun/pulse/internal/store"
)

type Handler struct {
store *store.Store
}

func New(s *store.Store) *Handler {
return &Handler{store: s}
}

func (h *Handler) ListEntries(w http.ResponseWriter, r *http.Request) {
entries, err := h.store.ListEntries(r.Context())
if err != nil {
err.Error(), http.StatusInternalServerError)

}
if entries == nil {
tries = []store.Entry{}
}
w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(entries)
}

func (h *Handler) CreateEntry(w http.ResponseWriter, r *http.Request) {
var body struct {
tent  string `json:"content"`
 string `json:"category"`
}
if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
"invalid body", http.StatusBadRequest)

}
if body.Content == "" {
"content is required", http.StatusBadRequest)

}
if body.Category == "" {
.Category = "general"
}
entry, err := h.store.CreateEntry(r.Context(), body.Content, body.Category)
if err != nil {
err.Error(), http.StatusInternalServerError)

}
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusCreated)
json.NewEncoder(w).Encode(entry)
}

func (h *Handler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
if err != nil {
"invalid id", http.StatusBadRequest)

}
if err := h.store.DeleteEntry(r.Context(), id); err != nil {
err.Error(), http.StatusInternalServerError)

}
w.WriteHeader(http.StatusNoContent)
}
