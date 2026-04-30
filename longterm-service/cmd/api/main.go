package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/omilun/pulse/longterm-service/internal/handler"
	"github.com/omilun/pulse/longterm-service/internal/store"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	if dsn == "" || jwtSecret == "" {
		log.Fatal("DATABASE_URL and JWT_SECRET are required")
	}

	db, err := store.New(dsn)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer db.Close()
	if err := db.Migrate(); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	h := handler.New(db)
	mux := http.NewServeMux()

	// Goals
	mux.HandleFunc("GET /api/lt/goals", h.ListGoals)
	mux.HandleFunc("POST /api/lt/goals", h.CreateGoal)
	mux.HandleFunc("GET /api/lt/goals/{id}", h.GetGoal)
	mux.HandleFunc("PUT /api/lt/goals/{id}", h.UpdateGoal)
	mux.HandleFunc("DELETE /api/lt/goals/{id}", h.DeleteGoal)

	// Stories (nested under goals)
	mux.HandleFunc("GET /api/lt/goals/{goalId}/stories", h.ListStories)
	mux.HandleFunc("POST /api/lt/goals/{goalId}/stories", h.CreateStory)
	mux.HandleFunc("GET /api/lt/stories/{id}", h.GetStory)
	mux.HandleFunc("PUT /api/lt/stories/{id}", h.UpdateStory)
	mux.HandleFunc("DELETE /api/lt/stories/{id}", h.DeleteStory)

	// Tasks (nested under stories)
	mux.HandleFunc("GET /api/lt/stories/{storyId}/tasks", h.ListTasks)
	mux.HandleFunc("POST /api/lt/stories/{storyId}/tasks", h.CreateTask)
	mux.HandleFunc("GET /api/lt/tasks/{id}", h.GetTask)
	mux.HandleFunc("PUT /api/lt/tasks/{id}", h.UpdateTask)
	mux.HandleFunc("DELETE /api/lt/tasks/{id}", h.DeleteTask)

	// Timeline
	mux.HandleFunc("GET /api/lt/timeline", h.GetTimeline)

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("longterm-service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, authMiddleware(jwtSecret, corsMiddleware(mux))))
}

// authMiddleware validates JWT and injects X-User-ID header
func authMiddleware(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		authHeader := r.Header.Get("Authorization")
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		claims, _ := token.Claims.(jwt.MapClaims)
		userID, _ := claims["sub"].(string)
		r = r.WithContext(context.WithValue(r.Context(), struct{}{}, userID))
		r.Header.Set("X-User-ID", userID)
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
