package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/xxix-labs/agropay/internal/model"
)

// UpsertCircleMeta stores circle name and description.
// First-write wins: if a record already exists for this circle_id, it is not
// overwritten. This prevents anyone from hijacking an existing circle's display name.
func (q *Queries) UpsertCircleMeta(ctx context.Context, meta model.CircleMeta) error {
	_, err := q.pool.Exec(ctx,
		`INSERT INTO circle_meta (circle_id, name, description)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (circle_id) DO NOTHING`,
		meta.CircleID,
		meta.Name,
		meta.Description,
	)
	return err
}

// GetCircleMeta retrieves stored metadata for a circle.
// Returns nil, nil if no metadata has been registered for this circle_id.
func (q *Queries) GetCircleMeta(ctx context.Context, circleID string) (*model.CircleMeta, error) {
	var m model.CircleMeta
	err := q.pool.QueryRow(ctx,
		`SELECT circle_id, name, description, created_at
		 FROM circle_meta
		 WHERE circle_id = $1`,
		circleID,
	).Scan(&m.CircleID, &m.Name, &m.Description, &m.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}
