# AGROPAY — Technical Requirements Document

**Full-Stack Production Specification**

**Version:** 2.0
**Date:** March 23, 2026
**Author:** Kunal Drall, XXIX Labs

---

## Table of Contents

1. System Overview
2. On-Chain Layer (Leo / Aleo)
3. Backend Service (Go)
4. Database Layer (PostgreSQL)
5. Cache Layer (Redis)
6. Chain Indexer
7. Frontend (Next.js)
8. API Specification
9. Authentication & Authorization
10. Deployment & Infrastructure
11. Monitoring & Observability
12. Testing Strategy
13. Migration Plan (Hackathon → Production)

---

## 1. System Overview

### 1.1 Architecture Summary

```
                                    ┌──────────────────┐
                                    │   Aleo Network    │
                                    │   (Testnet/Main)  │
                                    └────────┬─────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              │              │              │
                              ▼              ▼              ▼
                    ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
                    │   Chain     │  │  Leo Program │  │  Aleo RPC   │
                    │   Indexer   │  │  agropay.aleo│  │  (Provable) │
                    │   (Go)     │  └──────────────┘  └──────┬──────┘
                    └──────┬──────┘                           │
                           │                                  │
                           ▼                                  │
                    ┌──────────────┐                          │
                    │  PostgreSQL  │◄─────────────────────────┤
                    │  + Redis     │                          │
                    └──────┬──────┘                          │
                           │                                  │
                           ▼                                  │
                    ┌──────────────┐                          │
                    │  Go Backend  │──────────────────────────┘
                    │  (API Server)│        (reads mappings,
                    └──────┬──────┘         submits tx via SDK)
                           │
                           │ REST API + WebSocket
                           ▼
                    ┌──────────────┐
                    │  Next.js     │
                    │  Frontend    │──── Shield Wallet (direct chain interaction)
                    └──────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Leo Program** | On-chain state: circle lifecycle, contributions, payouts, credentials. Source of truth for all financial state. |
| **Go Backend** | Off-chain API: circle metadata enrichment, user sessions, notification dispatch, aggregate analytics, circle discovery. Does NOT handle funds or private keys. |
| **PostgreSQL** | Persistent storage: indexed circle metadata, user profiles, event history, notification queue. Mirror of on-chain state plus off-chain enrichments. |
| **Redis** | Hot cache: active circle states, session tokens, rate limits, pub/sub for real-time updates. |
| **Chain Indexer** | Polls Aleo blocks, extracts agropay.aleo transactions, updates PostgreSQL with decoded events. Runs as a background goroutine in the Go backend. |
| **Next.js Frontend** | User interface. Wallet interactions go directly to chain via Shield Wallet adapter. API calls go to Go backend for enriched data. |

### 1.3 Trust Boundaries

**On-chain (trustless):** Circle state, contributions, payouts, credentials. The Leo program enforces all invariants. The backend CANNOT modify on-chain state.

**Off-chain (trusted):** Circle names, descriptions, invite links, notification preferences, user display names, analytics. This data is convenience — losing it degrades UX but does not affect funds or privacy.

**Client-side (user-controlled):** Private keys, record decryption, proof generation. The backend NEVER receives private keys or decrypted record contents.

---

## 2. On-Chain Layer (Leo / Aleo)

### 2.1 Program Structure

Single program deployment: `agropay_v1.aleo`

**Structs (2):**
- `CircleInfo` — Circle configuration and status
- `RoundState` — Current round tracking

**Records (4):**
- `Membership` — Proves circle membership and rotation position
- `ContributionReceipt` — Proves contribution to a specific round
- `Payout` — The pot received by the round's designated recipient
- `Credential` — Completion credential for reputation

**Mappings (3):**
- `circles: field => CircleInfo` — Circle metadata
- `rounds: field => RoundState` — Round state per circle
- `members: field => u8` — Member count per circle

**Transitions (5):**
- `create_circle(circle_id, contribution_amount, total_members, frequency) → Membership`
- `join_circle(circle_id, position, contribution_amount, total_members) → Membership`
- `contribute(membership) → (Membership, ContributionReceipt)`
- `claim_pot(membership, expected_round) → (Membership, Payout)`
- `claim_credential(membership) → (Membership, Credential)`

### 2.2 Production Extensions (Post-Hackathon)

**Nullifier mapping** — Prevents double contribution per round:
```
mapping nullifiers: field => bool;
// key = BHP256::hash_to_field(owner_address, circle_id, current_round)
// set to true when member contributes
// checked in finalize to reject duplicates
```

**Token integration** — Wrap credits.aleo or usdcx.aleo transfers:
```
// Inside contribute transition:
// 1. Call credits.aleo::transfer_private(self.caller, agropay_escrow, amount)
// 2. Record the escrow in a mapping

// Inside claim_pot transition:
// 1. Call credits.aleo::transfer_public_to_private(recipient, pot_amount)
// 2. Clear the escrow entries
```

**Time-based enforcement** — Deadline transitions:
```
transition force_advance_round(circle_id: field) {
    // Anyone can call after deadline passes
    // finalize checks: block.height > round_start + deadline_blocks
    // Skips non-contributors, reduces pot proportionally
}
```

### 2.3 Program Deployment

```bash
# Build
cd contracts/agropay && leo build

# Deploy to testnet
snarkos developer deploy "agropay_v1.aleo" \
    --private-key "${PRIVATE_KEY}" \
    --query "https://api.explorer.provable.com/v1" \
    --path "./build/" \
    --broadcast "https://api.explorer.provable.com/v1/testnet/transaction/broadcast" \
    --fee 5000000

# Verify deployment
curl "https://api.explorer.provable.com/v1/testnet/program/agropay_v1.aleo"
```

---

## 3. Backend Service (Go)

### 3.1 Project Structure

```
backend/
├── cmd/
│   └── agropay/
│       └── main.go                # Entry point: starts HTTP server + indexer
├── internal/
│   ├── config/
│   │   └── config.go              # Environment-based config (envconfig)
│   ├── server/
│   │   ├── server.go              # HTTP server setup, middleware, routes
│   │   └── middleware.go          # CORS, rate limit, auth, logging
│   ├── handler/
│   │   ├── circle.go              # Circle CRUD handlers
│   │   ├── round.go               # Round state handlers
│   │   ├── user.go                # User profile handlers
│   │   ├── health.go              # Health check
│   │   └── ws.go                  # WebSocket handler for real-time updates
│   ├── service/
│   │   ├── circle.go              # Circle business logic
│   │   ├── round.go               # Round logic + notification triggers
│   │   ├── user.go                # User profile management
│   │   └── notification.go        # Notification dispatch (email/push)
│   ├── repository/
│   │   ├── circle.go              # Circle DB queries
│   │   ├── round.go               # Round DB queries
│   │   ├── user.go                # User DB queries
│   │   ├── event.go               # Event log DB queries
│   │   └── db.go                  # Database connection pool
│   ├── indexer/
│   │   ├── indexer.go             # Main indexer loop
│   │   ├── decoder.go             # Aleo transaction → domain event decoder
│   │   └── processor.go          # Event processor (updates DB)
│   ├── aleo/
│   │   ├── client.go              # Aleo RPC client (HTTP)
│   │   ├── mapping.go             # Mapping read helpers
│   │   └── types.go               # Aleo-specific type definitions
│   ├── cache/
│   │   └── redis.go               # Redis client wrapper
│   ├── model/
│   │   ├── circle.go              # Domain models
│   │   ├── round.go
│   │   ├── user.go
│   │   └── event.go
│   └── ws/
│       └── hub.go                 # WebSocket hub for broadcasting
├── migrations/
│   ├── 001_create_tables.up.sql
│   ├── 001_create_tables.down.sql
│   ├── 002_create_indexes.up.sql
│   └── 002_create_indexes.down.sql
├── scripts/
│   ├── migrate.sh                 # Run migrations
│   └── seed.sh                    # Seed test data
├── Dockerfile
├── docker-compose.yml
├── go.mod
├── go.sum
└── .env.example
```

### 3.2 Dependencies

```go
// go.mod
module github.com/xxix-labs/agropay

go 1.22

require (
    github.com/go-chi/chi/v5 v5.0.12       // HTTP router
    github.com/go-chi/cors v1.2.1           // CORS middleware
    github.com/jackc/pgx/v5 v5.5.5          // PostgreSQL driver (pool-native)
    github.com/redis/go-redis/v9 v9.5.1     // Redis client
    github.com/golang-migrate/migrate/v4 v4.17.0  // Database migrations
    github.com/kelseyhightower/envconfig v1.4.0    // Environment config
    github.com/gorilla/websocket v1.5.1     // WebSocket
    github.com/rs/zerolog v1.32.0           // Structured logging
    github.com/golang-jwt/jwt/v5 v5.2.1     // JWT for sessions
    golang.org/x/time v0.5.0               // Rate limiter
)
```

### 3.3 Configuration

```go
// internal/config/config.go
package config

import "github.com/kelseyhightower/envconfig"

type Config struct {
    // Server
    Port            int    `envconfig:"PORT" default:"8080"`
    Environment     string `envconfig:"ENVIRONMENT" default:"development"`

    // Database
    DatabaseURL     string `envconfig:"DATABASE_URL" required:"true"`
    DatabaseMaxConn int    `envconfig:"DATABASE_MAX_CONN" default:"25"`

    // Redis
    RedisURL        string `envconfig:"REDIS_URL" required:"true"`

    // Aleo
    AleoRPCURL      string `envconfig:"ALEO_RPC_URL" default:"https://api.explorer.provable.com/v1"`
    AleoProgramID   string `envconfig:"ALEO_PROGRAM_ID" default:"agropay_v1.aleo"`
    AleoNetwork     string `envconfig:"ALEO_NETWORK" default:"testnet"`

    // Indexer
    IndexerEnabled    bool `envconfig:"INDEXER_ENABLED" default:"true"`
    IndexerPollInterval int `envconfig:"INDEXER_POLL_INTERVAL_MS" default:"5000"`
    IndexerStartHeight  int `envconfig:"INDEXER_START_HEIGHT" default:"0"`

    // Auth
    JWTSecret       string `envconfig:"JWT_SECRET" required:"true"`

    // CORS
    AllowedOrigins  []string `envconfig:"ALLOWED_ORIGINS" default:"http://localhost:3000"`
}

func Load() (*Config, error) {
    var cfg Config
    err := envconfig.Process("AGROPAY", &cfg)
    return &cfg, err
}
```

### 3.4 Aleo RPC Client

```go
// internal/aleo/client.go
package aleo

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type Client struct {
    baseURL   string
    programID string
    network   string
    http      *http.Client
}

func NewClient(baseURL, programID, network string) *Client {
    return &Client{
        baseURL:   baseURL,
        programID: programID,
        network:   network,
        http: &http.Client{
            Timeout: 10 * time.Second,
        },
    }
}

// GetMappingValue reads a public mapping value from chain
func (c *Client) GetMappingValue(ctx context.Context, mapping, key string) (string, error) {
    url := fmt.Sprintf("%s/%s/program/%s/mapping/%s/%s",
        c.baseURL, c.network, c.programID, mapping, key)

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return "", fmt.Errorf("creating request: %w", err)
    }

    resp, err := c.http.Do(req)
    if err != nil {
        return "", fmt.Errorf("executing request: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusNotFound {
        return "", nil // Mapping key doesn't exist
    }
    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("unexpected status: %d", resp.StatusCode)
    }

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", fmt.Errorf("reading body: %w", err)
    }

    // Aleo API returns JSON-encoded string
    var value string
    if err := json.Unmarshal(body, &value); err != nil {
        // May return raw string without JSON encoding
        return string(body), nil
    }
    return value, nil
}

// GetLatestHeight returns the current block height
func (c *Client) GetLatestHeight(ctx context.Context) (uint32, error) {
    url := fmt.Sprintf("%s/%s/latest/height", c.baseURL, c.network)

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return 0, err
    }

    resp, err := c.http.Do(req)
    if err != nil {
        return 0, err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return 0, err
    }

    var height uint32
    if err := json.Unmarshal(body, &height); err != nil {
        return 0, err
    }
    return height, nil
}

// GetBlock returns transactions in a specific block
func (c *Client) GetBlock(ctx context.Context, height uint32) (*Block, error) {
    url := fmt.Sprintf("%s/%s/block/%d", c.baseURL, c.network, height)

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := c.http.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("block %d: status %d", height, resp.StatusCode)
    }

    var block Block
    if err := json.NewDecoder(resp.Body).Decode(&block); err != nil {
        return nil, err
    }
    return &block, nil
}
```

### 3.5 Chain Indexer

```go
// internal/indexer/indexer.go
package indexer

import (
    "context"
    "time"

    "github.com/rs/zerolog"
    "github.com/xxix-labs/agropay/internal/aleo"
    "github.com/xxix-labs/agropay/internal/repository"
    "github.com/xxix-labs/agropay/internal/cache"
    "github.com/xxix-labs/agropay/internal/ws"
)

type Indexer struct {
    aleo       *aleo.Client
    repo       *repository.Queries
    cache      *cache.Redis
    hub        *ws.Hub
    logger     zerolog.Logger
    programID  string
    pollMs     int
    lastHeight uint32
}

func New(
    aleoClient *aleo.Client,
    repo *repository.Queries,
    redisCache *cache.Redis,
    wsHub *ws.Hub,
    logger zerolog.Logger,
    programID string,
    pollMs int,
    startHeight uint32,
) *Indexer {
    return &Indexer{
        aleo:       aleoClient,
        repo:       repo,
        cache:      redisCache,
        hub:        wsHub,
        logger:     logger,
        programID:  programID,
        pollMs:     pollMs,
        lastHeight: startHeight,
    }
}

// Run starts the indexer loop. Blocks until context is cancelled.
func (idx *Indexer) Run(ctx context.Context) {
    ticker := time.NewTicker(time.Duration(idx.pollMs) * time.Millisecond)
    defer ticker.Stop()

    idx.logger.Info().Uint32("start_height", idx.lastHeight).Msg("indexer started")

    for {
        select {
        case <-ctx.Done():
            idx.logger.Info().Msg("indexer stopped")
            return
        case <-ticker.C:
            if err := idx.poll(ctx); err != nil {
                idx.logger.Error().Err(err).Msg("indexer poll failed")
            }
        }
    }
}

func (idx *Indexer) poll(ctx context.Context) error {
    latestHeight, err := idx.aleo.GetLatestHeight(ctx)
    if err != nil {
        return err
    }

    if latestHeight <= idx.lastHeight {
        return nil // No new blocks
    }

    // Process blocks sequentially (no gaps)
    for h := idx.lastHeight + 1; h <= latestHeight; h++ {
        block, err := idx.aleo.GetBlock(ctx, h)
        if err != nil {
            return err
        }

        events := DecodeBlock(block, idx.programID)
        for _, event := range events {
            if err := ProcessEvent(ctx, idx.repo, idx.cache, idx.hub, event); err != nil {
                idx.logger.Error().Err(err).
                    Uint32("height", h).
                    Str("event", event.Type).
                    Msg("failed to process event")
                // Continue processing other events; don't halt on single failure
            }
        }

        idx.lastHeight = h
    }

    // Persist last indexed height (for crash recovery)
    if err := idx.repo.SetIndexerHeight(ctx, idx.lastHeight); err != nil {
        idx.logger.Warn().Err(err).Msg("failed to persist indexer height")
    }

    return nil
}
```

```go
// internal/indexer/decoder.go
package indexer

import (
    "strings"
    "github.com/xxix-labs/agropay/internal/aleo"
)

type EventType string

const (
    EventCircleCreated EventType = "circle_created"
    EventMemberJoined  EventType = "member_joined"
    EventContribution  EventType = "contribution"
    EventPotClaimed    EventType = "pot_claimed"
    EventCircleCompleted EventType = "circle_completed"
    EventCredentialClaimed EventType = "credential_claimed"
)

type Event struct {
    Type        EventType
    BlockHeight uint32
    TxID        string
    CircleID    string
    Data        map[string]string // Decoded transition inputs/outputs
}

// DecodeBlock extracts agropay events from a block's transactions
func DecodeBlock(block *aleo.Block, programID string) []Event {
    var events []Event

    for _, tx := range block.Transactions {
        for _, transition := range tx.Transitions {
            if transition.Program != programID {
                continue
            }

            event := Event{
                BlockHeight: block.Height,
                TxID:        tx.ID,
                Data:        make(map[string]string),
            }

            switch {
            case strings.HasSuffix(transition.Function, "create_circle"):
                event.Type = EventCircleCreated
                event.CircleID = extractInput(transition.Inputs, 0) // circle_id

            case strings.HasSuffix(transition.Function, "join_circle"):
                event.Type = EventMemberJoined
                event.CircleID = extractInput(transition.Inputs, 0)

            case strings.HasSuffix(transition.Function, "contribute"):
                event.Type = EventContribution
                // circle_id is inside the consumed record; extract from finalize inputs
                event.CircleID = extractFinalizeInput(transition.FinalizeInputs, 0)

            case strings.HasSuffix(transition.Function, "claim_pot"):
                event.Type = EventPotClaimed
                event.CircleID = extractFinalizeInput(transition.FinalizeInputs, 0)

            case strings.HasSuffix(transition.Function, "claim_credential"):
                event.Type = EventCredentialClaimed
                event.CircleID = extractFinalizeInput(transition.FinalizeInputs, 0)

            default:
                continue
            }

            events = append(events, event)
        }
    }

    return events
}

func extractInput(inputs []aleo.TransitionInput, index int) string {
    if index < len(inputs) {
        return inputs[index].Value
    }
    return ""
}

func extractFinalizeInput(inputs []string, index int) string {
    if index < len(inputs) {
        return inputs[index]
    }
    return ""
}
```

```go
// internal/indexer/processor.go
package indexer

import (
    "context"
    "github.com/xxix-labs/agropay/internal/repository"
    "github.com/xxix-labs/agropay/internal/cache"
    "github.com/xxix-labs/agropay/internal/ws"
)

// ProcessEvent updates the database and cache based on a decoded chain event
func ProcessEvent(
    ctx context.Context,
    repo *repository.Queries,
    c *cache.Redis,
    hub *ws.Hub,
    event Event,
) error {
    // Log the event
    if err := repo.InsertEvent(ctx, repository.InsertEventParams{
        Type:        string(event.Type),
        CircleID:    event.CircleID,
        TxID:        event.TxID,
        BlockHeight: int64(event.BlockHeight),
    }); err != nil {
        return err
    }

    switch event.Type {
    case EventCircleCreated:
        // Read the full circle info from chain mapping and store in DB
        return syncCircleFromChain(ctx, repo, c, event.CircleID)

    case EventMemberJoined:
        // Update member count in DB, check if circle activated
        return syncCircleFromChain(ctx, repo, c, event.CircleID)

    case EventContribution:
        // Update contribution count in DB
        return syncRoundFromChain(ctx, repo, c, event.CircleID)

    case EventPotClaimed:
        // Update round state, check if circle completed
        return syncRoundFromChain(ctx, repo, c, event.CircleID)

    case EventCredentialClaimed:
        // No DB update needed; credential is a private record
        return nil
    }

    // Broadcast to WebSocket subscribers
    hub.Broadcast(event.CircleID, event)

    return nil
}

func syncCircleFromChain(ctx context.Context, repo *repository.Queries, c *cache.Redis, circleID string) error {
    // Implementation: call aleo.GetMappingValue("circles", circleID),
    // parse the CircleInfo struct, upsert into PostgreSQL, update Redis cache
    return nil
}

func syncRoundFromChain(ctx context.Context, repo *repository.Queries, c *cache.Redis, circleID string) error {
    // Implementation: call aleo.GetMappingValue("rounds", circleID),
    // parse the RoundState struct, upsert into PostgreSQL, update Redis cache
    return nil
}
```

### 3.6 HTTP Handlers

```go
// internal/handler/circle.go
package handler

import (
    "encoding/json"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/xxix-labs/agropay/internal/service"
)

type CircleHandler struct {
    svc *service.CircleService
}

func NewCircleHandler(svc *service.CircleService) *CircleHandler {
    return &CircleHandler{svc: svc}
}

// GET /api/v1/circles/{circle_id}
func (h *CircleHandler) GetCircle(w http.ResponseWriter, r *http.Request) {
    circleID := chi.URLParam(r, "circle_id")

    circle, err := h.svc.GetCircle(r.Context(), circleID)
    if err != nil {
        http.Error(w, "Circle not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(circle)
}

// GET /api/v1/circles/{circle_id}/round
func (h *CircleHandler) GetRound(w http.ResponseWriter, r *http.Request) {
    circleID := chi.URLParam(r, "circle_id")

    round, err := h.svc.GetRound(r.Context(), circleID)
    if err != nil {
        http.Error(w, "Round not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(round)
}

// POST /api/v1/circles — Register circle metadata (off-chain enrichment)
func (h *CircleHandler) RegisterCircle(w http.ResponseWriter, r *http.Request) {
    var req struct {
        CircleID    string `json:"circle_id"`
        Name        string `json:"name"`
        Description string `json:"description"`
        TxID        string `json:"tx_id"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if err := h.svc.RegisterCircleMetadata(r.Context(), req.CircleID, req.Name, req.Description, req.TxID); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"status": "registered"})
}

// GET /api/v1/circles/{circle_id}/events
func (h *CircleHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
    circleID := chi.URLParam(r, "circle_id")

    events, err := h.svc.GetCircleEvents(r.Context(), circleID)
    if err != nil {
        http.Error(w, "Failed to fetch events", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(events)
}
```

### 3.7 Router Setup

```go
// internal/server/server.go
package server

import (
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "github.com/go-chi/cors"
    "github.com/xxix-labs/agropay/internal/handler"
)

func NewRouter(
    circleH *handler.CircleHandler,
    userH *handler.UserHandler,
    healthH *handler.HealthHandler,
    wsH *handler.WSHandler,
    allowedOrigins []string,
) http.Handler {
    r := chi.NewRouter()

    // Middleware
    r.Use(middleware.RequestID)
    r.Use(middleware.RealIP)
    r.Use(middleware.Recoverer)
    r.Use(middleware.Timeout(30 * time.Second))
    r.Use(cors.Handler(cors.Options{
        AllowedOrigins:   allowedOrigins,
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
        ExposedHeaders:   []string{"Link"},
        AllowCredentials: true,
        MaxAge:           300,
    }))

    // Health
    r.Get("/health", healthH.Check)

    // API v1
    r.Route("/api/v1", func(r chi.Router) {
        // Public endpoints
        r.Get("/circles/{circle_id}", circleH.GetCircle)
        r.Get("/circles/{circle_id}/round", circleH.GetRound)
        r.Get("/circles/{circle_id}/events", circleH.GetEvents)

        // Authenticated endpoints
        r.Group(func(r chi.Router) {
            r.Use(AuthMiddleware)
            r.Post("/circles", circleH.RegisterCircle)
            r.Get("/user/circles", userH.GetUserCircles)
            r.Put("/user/profile", userH.UpdateProfile)
        })
    })

    // WebSocket
    r.Get("/ws/{circle_id}", wsH.Handle)

    return r
}
```

---

## 4. Database Layer (PostgreSQL)

### 4.1 Schema

```sql
-- migrations/001_create_tables.up.sql

-- Circles: mirrors on-chain CircleInfo + off-chain metadata
CREATE TABLE circles (
    circle_id       TEXT PRIMARY KEY,           -- Aleo field value
    admin_address   TEXT NOT NULL,              -- Creator's Aleo address
    name            TEXT,                        -- Off-chain: human-readable name
    description     TEXT,                        -- Off-chain: circle description
    contribution_amount BIGINT NOT NULL,         -- In microcredits
    total_members   SMALLINT NOT NULL,
    frequency       SMALLINT NOT NULL DEFAULT 0, -- 0=weekly, 1=biweekly, 2=monthly
    status          SMALLINT NOT NULL DEFAULT 0, -- 0=pending, 1=active, 2=completed
    member_count    SMALLINT NOT NULL DEFAULT 1,
    created_at_block BIGINT NOT NULL DEFAULT 0,
    deploy_tx_id    TEXT,                        -- Transaction ID of creation
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rounds: mirrors on-chain RoundState
CREATE TABLE rounds (
    circle_id               TEXT NOT NULL REFERENCES circles(circle_id),
    round_number            SMALLINT NOT NULL,
    contributions_received  SMALLINT NOT NULL DEFAULT 0,
    pot_disbursed           BOOLEAN NOT NULL DEFAULT FALSE,
    round_start_block       BIGINT NOT NULL DEFAULT 0,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,
    PRIMARY KEY (circle_id, round_number)
);

-- Users: off-chain user profiles linked to Aleo addresses
CREATE TABLE users (
    address         TEXT PRIMARY KEY,           -- Aleo address
    display_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-Circle membership: off-chain tracking (on-chain record is private)
-- NOTE: This is populated when users voluntarily register their membership
-- via the frontend. It is NOT a source of truth for membership — the on-chain
-- Membership record is. This enables the backend to show "your circles" without
-- requiring record decryption server-side.
CREATE TABLE user_circles (
    address         TEXT NOT NULL REFERENCES users(address),
    circle_id       TEXT NOT NULL REFERENCES circles(circle_id),
    position        SMALLINT,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (address, circle_id)
);

-- Events: indexed from chain, used for activity feeds
CREATE TABLE events (
    id              BIGSERIAL PRIMARY KEY,
    event_type      TEXT NOT NULL,              -- circle_created, member_joined, contribution, pot_claimed, etc.
    circle_id       TEXT NOT NULL,
    tx_id           TEXT NOT NULL,
    block_height    BIGINT NOT NULL,
    data            JSONB,                      -- Additional decoded data
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexer state: tracks last processed block
CREATE TABLE indexer_state (
    id              INTEGER PRIMARY KEY DEFAULT 1, -- Singleton
    last_height     BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_prefs (
    address         TEXT NOT NULL REFERENCES users(address),
    circle_id       TEXT NOT NULL REFERENCES circles(circle_id),
    notify_contribution BOOLEAN NOT NULL DEFAULT TRUE,
    notify_pot_ready    BOOLEAN NOT NULL DEFAULT TRUE,
    notify_round_start  BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (address, circle_id)
);
```

### 4.2 Indexes

```sql
-- migrations/002_create_indexes.up.sql

CREATE INDEX idx_circles_status ON circles(status);
CREATE INDEX idx_circles_admin ON circles(admin_address);
CREATE INDEX idx_rounds_circle ON rounds(circle_id);
CREATE INDEX idx_events_circle ON events(circle_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_block ON events(block_height);
CREATE INDEX idx_user_circles_address ON user_circles(address);
CREATE INDEX idx_user_circles_circle ON user_circles(circle_id);
```

### 4.3 Key Design Decisions

**Why mirror on-chain data in PostgreSQL?**

Reading Aleo mappings via RPC is slow (~500ms–2s per call) and has no filtering, pagination, or joins. The backend mirrors on-chain state into PostgreSQL for fast, indexed queries. The chain indexer keeps the mirror updated. If the DB and chain ever disagree, chain is authoritative.

**Why the user_circles table if membership is private?**

On-chain Membership records are private — only the owner can decrypt them. The backend cannot enumerate circle members without their view keys (which it never has). Instead, when a user connects their wallet and the frontend decrypts their records, the frontend can optionally POST the mapping `(address, circle_id, position)` to the backend. This is voluntary and convenience-only — users can opt out without losing any functionality. The backend uses this for "My Circles" queries and notification routing.

---

## 5. Cache Layer (Redis)

### 5.1 Key Schema

```
# Active circle state (refreshed by indexer)
circle:{circle_id}:info     → JSON CircleInfo          TTL: 60s
circle:{circle_id}:round    → JSON RoundState           TTL: 30s
circle:{circle_id}:members  → integer member_count      TTL: 60s

# Rate limiting
ratelimit:{ip}:{endpoint}   → counter                   TTL: 60s

# Session tokens
session:{token}             → JSON { address, expires }  TTL: 24h

# WebSocket subscriptions (pub/sub channels)
Channel: circle:{circle_id}:events
```

### 5.2 Cache Strategy

| Data | Cache TTL | Refresh Trigger |
|------|-----------|-----------------|
| Circle info | 60 seconds | Indexer event (circle_created, member_joined) |
| Round state | 30 seconds | Indexer event (contribution, pot_claimed) |
| Member count | 60 seconds | Indexer event (member_joined) |

The short TTLs ensure the frontend sees fresh data without polling the chain directly. The indexer proactively invalidates/refreshes cache on every relevant event.

---

## 6. Chain Indexer

### 6.1 Indexing Strategy

The indexer runs as a goroutine inside the Go backend process. It:

1. Reads `indexer_state.last_height` from PostgreSQL on startup
2. Polls `GET /testnet/latest/height` every 5 seconds
3. For each new block, fetches the full block and filters for `agropay_v1.aleo` transitions
4. Decodes each transition into a domain event
5. Processes events: updates PostgreSQL, invalidates Redis cache, broadcasts to WebSocket subscribers
6. Persists `last_height` to PostgreSQL after each block

### 6.2 Crash Recovery

On startup, the indexer resumes from `last_height + 1`. Any events in the gap between last persistence and the crash are reprocessed. Event processing is idempotent (upserts, not inserts) to handle replays.

### 6.3 Reorg Handling

Aleo's AleoBFT provides fast finality (~10-15 second blocks). Reorgs beyond 1-2 blocks are extremely rare. The indexer does not implement reorg detection for v1. For production, add a confirmation depth of 5 blocks before processing events.

---

## 7. Frontend (Next.js)

### 7.1 Data Flow

```
User action → Shield Wallet → Aleo Network (on-chain tx)
                                    │
                                    ▼ (indexer picks up)
                              Go Backend → PostgreSQL
                                    │
                                    ▼ (WebSocket push)
                              Frontend re-renders
```

**On-chain writes** (create, join, contribute, claim) go directly from the frontend through the wallet to the chain. The backend is NOT in the write path.

**On-chain reads** go through the backend (which serves cached PostgreSQL data) or directly to the Aleo RPC for mapping reads that aren't cached.

**Private data** (Membership records, receipts, payouts, credentials) are decrypted client-side by the wallet using the user's view key. The backend never sees private data.

### 7.2 State Architecture

```
GLOBAL STATE (Zustand)
├── wallet: { address, connected, publicKey }
├── records: {
│     memberships: Membership[],    ← Decrypted client-side
│     receipts: ContributionReceipt[],
│     payouts: Payout[],
│     credentials: Credential[]
│   }
└── ui: { loading, error, activeModal }

SERVER STATE (React Query / SWR against Go backend)
├── circles: CircleInfo[]           ← From GET /api/v1/circles
├── rounds: RoundState[]            ← From GET /api/v1/circles/:id/round
└── events: Event[]                 ← From GET /api/v1/circles/:id/events

REAL-TIME STATE (WebSocket)
└── Subscribed circle updates       ← Push from backend on chain events
```

---

## 8. API Specification

### 8.1 Public Endpoints

```
GET /health
  → 200 { "status": "ok", "chain_height": 12345, "indexer_height": 12343 }

GET /api/v1/circles/{circle_id}
  → 200 {
      "circle_id": "123field",
      "name": "Lagos Savings Club",
      "admin_address": "aleo1...",
      "contribution_amount": 10000000,
      "total_members": 8,
      "member_count": 8,
      "frequency": 1,
      "status": 1,
      "current_round": 3,
      "contributions_received": 5,
      "created_at": "2026-03-23T10:00:00Z"
    }
  → 404 { "error": "Circle not found" }

GET /api/v1/circles/{circle_id}/round
  → 200 {
      "current_round": 3,
      "contributions_received": 5,
      "total_members": 8,
      "pot_disbursed": false,
      "round_start_block": 45000
    }

GET /api/v1/circles/{circle_id}/events?limit=20&offset=0
  → 200 {
      "events": [
        {
          "type": "contribution",
          "tx_id": "at1...",
          "block_height": 45123,
          "indexed_at": "2026-03-23T10:05:00Z"
        }
      ],
      "total": 42
    }
```

### 8.2 Authenticated Endpoints

```
POST /api/v1/circles
  Headers: Authorization: Bearer <jwt>
  Body: { "circle_id": "123field", "name": "My Circle", "description": "..." }
  → 201 { "status": "registered" }

GET /api/v1/user/circles
  Headers: Authorization: Bearer <jwt>
  → 200 { "circles": [ ... ] }

PUT /api/v1/user/profile
  Headers: Authorization: Bearer <jwt>
  Body: { "display_name": "Amara" }
  → 200 { "status": "updated" }

POST /api/v1/user/register-membership
  Headers: Authorization: Bearer <jwt>
  Body: { "circle_id": "123field", "position": 3 }
  → 201 { "status": "registered" }
```

### 8.3 WebSocket

```
WS /ws/{circle_id}

Server pushes events:
{
  "type": "contribution",
  "circle_id": "123field",
  "contributions_received": 6,
  "total_members": 8,
  "block_height": 45124,
  "timestamp": "2026-03-23T10:06:00Z"
}

{
  "type": "pot_claimed",
  "circle_id": "123field",
  "round": 3,
  "next_round": 4,
  "timestamp": "2026-03-23T10:10:00Z"
}
```

---

## 9. Authentication & Authorization

### 9.1 Wallet-Based Authentication

No passwords. Users authenticate by signing a challenge message with their Aleo wallet.

```
1. Frontend: GET /api/v1/auth/challenge?address=aleo1...
   → 200 { "challenge": "Sign this to authenticate with AGROPAY: nonce=abc123" }

2. Frontend: User signs the challenge via Shield Wallet

3. Frontend: POST /api/v1/auth/verify
   Body: { "address": "aleo1...", "signature": "sign1...", "challenge": "..." }
   → 200 { "token": "jwt...", "expires_at": "..." }

4. Frontend: Includes JWT in Authorization header for authenticated requests
```

### 9.2 Authorization Model

| Role | Permissions |
|------|------------|
| **Anonymous** | Read circle info, round state, events |
| **Authenticated** | All anonymous + register circle metadata, register membership, update profile |
| **Circle Admin** | All authenticated + no additional backend permissions (admin enforcement is on-chain) |

The backend has NO privileged operations over on-chain state. All write operations to the chain go through the user's wallet.

---

## 10. Deployment & Infrastructure

### 10.1 Docker Compose (Development)

```yaml
# docker-compose.yml
version: "3.9"

services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://agropay:agropay@postgres:5432/agropay?sslmode=disable
      - REDIS_URL=redis://redis:6379
      - ALEO_RPC_URL=https://api.explorer.provable.com/v1
      - ALEO_PROGRAM_ID=agropay_v1.aleo
      - ALEO_NETWORK=testnet
      - JWT_SECRET=dev-secret-change-in-prod
      - ALLOWED_ORIGINS=http://localhost:3000
      - INDEXER_ENABLED=true
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: agropay
      POSTGRES_PASSWORD: agropay
      POSTGRES_DB: agropay
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agropay"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080
      - NEXT_PUBLIC_ALEO_PROGRAM_ID=agropay_v1.aleo
      - NEXT_PUBLIC_ALEO_NETWORK=testnet

volumes:
  pgdata:
```

### 10.2 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /agropay ./cmd/agropay

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /agropay /agropay
COPY migrations /migrations

EXPOSE 8080
CMD ["/agropay"]
```

### 10.3 Production Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| Go Backend | Railway / Fly.io / AWS ECS | Single container, 512MB RAM, auto-scale |
| PostgreSQL | Supabase / Neon / AWS RDS | Managed, 1 vCPU, 1GB RAM, daily backups |
| Redis | Upstash / AWS ElastiCache | Managed, 256MB, eviction policy: allkeys-lru |
| Frontend | Vercel | Next.js auto-deploy from GitHub |
| Domain | Cloudflare | DNS, CDN, DDoS protection |

---

## 11. Monitoring & Observability

### 11.1 Logging

Structured JSON logs via zerolog. Every request gets a request ID. Every chain interaction logs the block height and transaction ID.

```go
logger.Info().
    Str("request_id", requestID).
    Str("method", r.Method).
    Str("path", r.URL.Path).
    Int("status", status).
    Dur("duration", duration).
    Msg("request completed")
```

### 11.2 Health Check

```
GET /health → 200
{
  "status": "ok",
  "version": "1.0.0",
  "chain_height": 50000,
  "indexer_height": 49998,
  "indexer_lag": 2,
  "db_connected": true,
  "redis_connected": true
}
```

Alerting: fire if `indexer_lag > 20` or `db_connected == false` or `redis_connected == false`.

### 11.3 Metrics (Production)

Export to Prometheus / Grafana:

- `agropay_http_requests_total{method, path, status}`
- `agropay_http_request_duration_seconds{method, path}`
- `agropay_indexer_blocks_processed_total`
- `agropay_indexer_lag_blocks`
- `agropay_circles_total{status}`
- `agropay_active_websocket_connections`

---

## 12. Testing Strategy

### 12.1 Leo Tests

```bash
cd contracts/agropay
leo build        # Compilation check
leo run create_circle 1field 10000000u64 3u8 0u8   # Smoke test
```

### 12.2 Go Backend Tests

```
backend/
├── internal/
│   ├── handler/
│   │   └── circle_test.go      # HTTP handler tests (httptest)
│   ├── service/
│   │   └── circle_test.go      # Business logic tests (mock repo)
│   ├── repository/
│   │   └── circle_test.go      # DB integration tests (testcontainers)
│   ├── indexer/
│   │   ├── decoder_test.go     # Unit tests for event decoding
│   │   └── processor_test.go   # Integration tests with test DB
│   └── aleo/
│       └── client_test.go      # HTTP mock tests for Aleo RPC
```

Run: `go test ./...`

### 12.3 Integration Tests

```bash
# scripts/test-flow.sh
# Full lifecycle test against testnet

# 1. Deploy program
# 2. Create circle via snarkos execute
# 3. Join circle with 2 more accounts
# 4. Contribute from all 3
# 5. Claim pot
# 6. Verify mapping values via API
# 7. Verify backend indexed the events
# 8. Verify WebSocket received updates
```

### 12.4 Frontend Tests

- Component tests: Vitest + React Testing Library
- E2E: Playwright against local dev stack
- Wallet mocking: Mock the `useWallet` hook for non-wallet tests

---

## 13. Migration Plan (Hackathon → Production)

### Phase 1: Hackathon (v1) — Current

- Leo program on testnet (no actual token transfer)
- Next.js frontend with Shield Wallet
- No backend — frontend reads chain directly
- No database — all state from chain

### Phase 2: Add Backend (Post-Wave 5)

- Deploy Go backend + PostgreSQL + Redis
- Run chain indexer against testnet
- Frontend switches from direct chain reads to backend API
- Add WebSocket for real-time updates
- Add wallet-based authentication

### Phase 3: Token Integration (Pre-Mainnet)

- Modify Leo program to wrap credits.aleo/usdcx.aleo transfers
- Add nullifier mapping for double-contribution prevention
- Deploy new program version to testnet
- Full integration testing with real token movement

### Phase 4: Mainnet (Launch)

- Deploy Leo program to mainnet
- Point backend to mainnet RPC
- Run fresh indexer from mainnet genesis
- Enable protocol fee collection
- Activate monitoring and alerting

---

*AGROPAY Technical Requirements Document v2.0 — XXIX Labs*
