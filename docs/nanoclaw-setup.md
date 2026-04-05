# NanoClaw Setup Guide

Connect [NanoClaw](https://github.com/qwibitai/nanoclaw) (personal assistant bot) to Meal Assistant so it can add recipes from email, query the recipe library, and push the weekly meal plan to WhatsApp.

## Prerequisites

- Meal Assistant deployed to Vercel (or running locally)
- `CRON_SECRET` set in your Vercel environment variables
- NanoClaw instance running and able to make HTTP requests

## 1. Configure Authentication

NanoClaw authenticates with Meal Assistant using a Bearer token. The token is the value of the `CRON_SECRET` environment variable set on your Meal Assistant deployment.

Add to your NanoClaw config:

```yaml
meal_assistant:
  base_url: https://your-meal-assistant.vercel.app
  auth_token: ${CRON_SECRET}  # same value as Meal Assistant's CRON_SECRET
```

All API requests must include the header:

```
Authorization: Bearer <your-CRON_SECRET-value>
```

When `CRON_SECRET` is not set (local dev/demo mode), auth is skipped and no header is needed.

## 2. Core Workflows

### Adding recipes from email

When NanoClaw parses a recipe from an incoming email, POST it to Meal Assistant:

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Garlic Butter Salmon",
    "ingredients": [
      { "name": "salmon fillet", "quantity": "2", "unit": "pieces" },
      { "name": "butter", "quantity": "3", "unit": "tbsp" },
      { "name": "garlic", "quantity": "4", "unit": "cloves" }
    ],
    "tags": ["dinner", "seafood", "quick"],
    "servings": 2,
    "prep_time": 5,
    "cook_time": 15,
    "source_url": "https://example.com/salmon-recipe",
    "notes": "Added from email on 2026-04-04"
  }' \
  https://your-meal-assistant.vercel.app/api/recipes
```

**Required fields:** `name`, `ingredients` (array with at least one item, each needing a `name`).

**Optional fields:** `instructions`, `tags`, `servings`, `prep_time`, `cook_time`, `source_url`, `notes`.

### Searching the recipe library

Query recipes by name or tag to answer questions like "what can I make with chicken?":

```bash
# Search by name
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-meal-assistant.vercel.app/api/recipes?q=chicken"

# Filter by tag
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-meal-assistant.vercel.app/api/recipes?tag=vegetarian"

# Combined (AND logic)
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-meal-assistant.vercel.app/api/recipes?q=pasta&tag=quick"
```

Search is case-insensitive. An empty result returns `[]` (not 404).

### Fetching the weekly meal plan

Poll for the latest meal plan after the Sunday cron runs:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-meal-assistant.vercel.app/api/plan/current
```

Response includes `dinners` (array of 5 day/recipe pairs) and `groceryList`. Use `weekOf` to confirm it's the current week's plan.

**Polling strategy:** Check once after the cron window (Sunday evening). If `weekOf` matches the upcoming Monday, the plan is fresh. No webhook is available — polling is the intended pattern.

## 3. Field Mapping

NanoClaw must map parsed email content to Meal Assistant's schema. Key differences from common recipe formats:

| Meal Assistant field | Common alternative | Notes |
|---------------------|--------------------|-------|
| `name` | `title` | Recipe name |
| `prep_time` | `prepTime` | Minutes, integer, underscore naming |
| `cook_time` | `cookTime` | Minutes, integer, underscore naming |
| `source_url` | `source`, `url` | Full URL string |
| `ingredients[].name` | `ingredient` | Each ingredient is an object |
| `ingredients[].quantity` | `amount` | String, not number |
| `ingredients[].unit` | `measurement` | String (e.g., "g", "tbsp", "cups") |

## 4. Error Handling

All errors return JSON with an `error` field:

```json
{ "error": "Description of what went wrong" }
```

| Status | Meaning | NanoClaw action |
|--------|---------|-----------------|
| `401` | Missing or invalid Bearer token | Check `CRON_SECRET` config |
| `400` | Validation error (missing name, bad ID format) | Fix request payload |
| `404` | Recipe or plan not found | Handle gracefully (no plan generated yet, recipe deleted) |
| `500` | Server error | Retry with backoff |

## 5. Full API Reference

See [docs/api.md](api.md) for complete endpoint documentation including all request/response schemas.
