package config

import "github.com/kelseyhightower/envconfig"

type Config struct {
	Port           int      `envconfig:"PORT" default:"8080"`
	DatabaseURL    string   `envconfig:"DATABASE_URL" required:"true"`
	AllowedOrigins []string `envconfig:"ALLOWED_ORIGINS" default:"http://localhost:3000"`
	Environment    string   `envconfig:"ENVIRONMENT" default:"development"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("AGROPAY", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
