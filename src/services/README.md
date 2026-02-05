# Services

This directory contains external API clients and service integrations.

## Purpose

Services encapsulate communication with external APIs and third-party services, keeping the business logic separate from infrastructure concerns.

## Examples

- Book search APIs (Google Books, Open Library)
- Push notification services
- Email services
- Payment gateways

## Conventions

- Each service should be in its own file (e.g., `bookSearch.ts`, `notifications.ts`)
- Export typed functions that handle API communication
- Handle errors gracefully and return typed results
- Use environment variables for API keys and configuration
