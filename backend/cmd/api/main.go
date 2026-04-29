package main

import (
"log"
"net/http"
"os"

"github.com/omilun/pulse/internal/handler"
"github.com/omilun/pulse/internal/store"
)

func main() {
dsn := os.Getenv("DATABASE_URL")
if dsn == "" {
is required")
}

db, err := store.New(dsn)
if err != nil {
nect db: %v", err)
}
defer db.Close()

if err := db.Migrate(); err != nil {
%v", err)
}

h := handler.New(db)
mux := http.NewServeMux()

mux.HandleFunc("GET /api/entries", h.ListEntries)
mux.HandleFunc("POST /api/entries", h.CreateEntry)
mux.HandleFunc("DELETE /api/entries/{id}", h.DeleteEntry)
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
:= os.Getenv("PORT")
if port == "" {
= "8080"
}
log.Printf("listening on :%s", port)
log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(mux)))
}

func corsMiddleware(next http.Handler) http.Handler {
return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
trol-Allow-Origin", "*")
trol-Allow-Methods", "GET, POST, DELETE, OPTIONS")
trol-Allow-Headers", "Content-Type")
r.Method == http.MethodOptions {
oContent)

ext.ServeHTTP(w, r)
})
}
