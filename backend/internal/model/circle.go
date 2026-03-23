package model

import "time"

// CircleMeta is off-chain metadata for a circle.
// On-chain state (amounts, status, rounds) lives in agropay_v1.aleo mappings.
// This struct only stores the human-readable name and description that Leo
// cannot store (no string type in the language).
type CircleMeta struct {
	CircleID    string    `json:"circle_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}
