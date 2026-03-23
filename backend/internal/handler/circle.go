package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/xxix-labs/agropay/internal/model"
	"github.com/xxix-labs/agropay/internal/repository"
)

type CircleHandler struct {
	repo   *repository.Queries
	logger zerolog.Logger
}

func NewCircleHandler(repo *repository.Queries, logger zerolog.Logger) *CircleHandler {
	return &CircleHandler{repo: repo, logger: logger}
}

// POST /api/v1/circles/register
// Body: { "circle_id": "...", "name": "...", "description": "..." }
// First-write wins — subsequent calls for the same circle_id are silently ignored.
func (h *CircleHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CircleID    string `json:"circle_id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.CircleID = strings.TrimSpace(req.CircleID)
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)

	if req.CircleID == "" {
		writeError(w, http.StatusBadRequest, "circle_id is required")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if len(req.Name) > 120 {
		writeError(w, http.StatusBadRequest, "name must be 120 characters or fewer")
		return
	}
	if len(req.Description) > 400 {
		writeError(w, http.StatusBadRequest, "description must be 400 characters or fewer")
		return
	}

	if err := h.repo.UpsertCircleMeta(r.Context(), model.CircleMeta{
		CircleID:    req.CircleID,
		Name:        req.Name,
		Description: req.Description,
	}); err != nil {
		h.logger.Error().Err(err).Str("circle_id", req.CircleID).Msg("upsert circle meta failed")
		writeError(w, http.StatusInternalServerError, "failed to store metadata")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/circles/{id}/meta
func (h *CircleHandler) GetMeta(w http.ResponseWriter, r *http.Request) {
	circleID := chi.URLParam(r, "id")
	if circleID == "" {
		writeError(w, http.StatusBadRequest, "circle id is required")
		return
	}

	meta, err := h.repo.GetCircleMeta(r.Context(), circleID)
	if err != nil {
		h.logger.Error().Err(err).Str("circle_id", circleID).Msg("get circle meta failed")
		writeError(w, http.StatusInternalServerError, "failed to fetch metadata")
		return
	}
	if meta == nil {
		writeError(w, http.StatusNotFound, "no metadata registered for this circle")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(meta)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
