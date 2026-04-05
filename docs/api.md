# Meal Assistant API

Base URL: `https://<your-domain>` (Vercel deployment) or `http://localhost:3000` (local dev).

## Authentication

All endpoints accept Bearer token authentication using the `CRON_SECRET` environment variable.

- When `CRON_SECRET` is **not set or empty**: authentication is skipped (local dev / demo mode)
- When `CRON_SECRET` is **set**: all requests require a valid `Authorization` header

```
Authorization: Bearer <CRON_SECRET>
```

Requests without a valid token return `401 Unauthorized`:

```json
{ "error": "Unauthorized" }
```

---

## Endpoints

### List Recipes

```
GET /api/recipes
```

Returns all recipes, optionally filtered by name and/or tag.

**Query parameters:**

| Param | Type   | Description                                    |
|-------|--------|------------------------------------------------|
| `q`   | string | Case-insensitive substring match on recipe name |
| `tag` | string | Filter by tag (case-insensitive)               |

When both `q` and `tag` are provided, results must match both (AND logic).

**Response:** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Chicken Tikka Masala",
    "ingredients": [
      { "name": "chicken breast", "quantity": "500", "unit": "g" },
      { "name": "tikka paste", "quantity": "3", "unit": "tbsp" }
    ],
    "instructions": "Marinate chicken...",
    "tags": ["dinner", "indian"],
    "servings": 4,
    "prep_time": 20,
    "cook_time": 30,
    "source_url": "https://example.com/tikka",
    "notes": null,
    "created_at": "2026-01-15T10:00:00.000Z",
    "updated_at": "2026-01-15T10:00:00.000Z"
  }
]
```

**Examples:**

```bash
# All recipes
curl -H "Authorization: Bearer $CRON_SECRET" https://example.com/api/recipes

# Search by name
curl -H "Authorization: Bearer $CRON_SECRET" "https://example.com/api/recipes?q=chicken"

# Filter by tag
curl -H "Authorization: Bearer $CRON_SECRET" "https://example.com/api/recipes?tag=vegetarian"

# Combined
curl -H "Authorization: Bearer $CRON_SECRET" "https://example.com/api/recipes?q=pasta&tag=quick"
```

---

### Get Recipe by ID

```
GET /api/recipes/:id
```

**Response:** `200 OK` — single recipe object (same shape as list items)

**Errors:**
- `400` — Invalid UUID format
- `404` — Recipe not found

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://example.com/api/recipes/550e8400-e29b-41d4-a716-446655440000
```

---

### Create Recipe

```
POST /api/recipes
```

**Request body:**

| Field         | Type              | Required | Description                          |
|---------------|-------------------|----------|--------------------------------------|
| `name`        | string            | yes      | Recipe name                          |
| `ingredients` | Ingredient[]      | yes      | Non-empty array of ingredients       |
| `instructions`| string            | no       | Cooking instructions                 |
| `tags`        | string[]          | no       | Category tags (e.g., "dinner", "quick") |
| `servings`    | number            | no       | Number of servings                   |
| `prep_time`   | number            | no       | Prep time in minutes                 |
| `cook_time`   | number            | no       | Cook time in minutes                 |
| `source_url`  | string            | no       | URL where the recipe was found       |
| `notes`       | string            | no       | Additional notes                     |

**Ingredient object:**

| Field      | Type   | Required | Description              |
|------------|--------|----------|--------------------------|
| `name`     | string | yes      | Ingredient name          |
| `quantity` | string | no       | Amount (e.g., "500")     |
| `unit`     | string | no       | Unit (e.g., "g", "tbsp") |

**Response:** `201 Created` — the created recipe object

**Errors:**
- `400` — Validation error (missing name, empty ingredients, etc.)

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Garlic Pasta",
    "ingredients": [
      { "name": "spaghetti", "quantity": "400", "unit": "g" },
      { "name": "garlic", "quantity": "4", "unit": "cloves" }
    ],
    "tags": ["dinner", "quick"],
    "servings": 2,
    "prep_time": 5,
    "cook_time": 15
  }' \
  https://example.com/api/recipes
```

---

### Update Recipe

```
PUT /api/recipes/:id
```

**Request body:** Same fields as Create (all required fields must be present).

**Response:** `200 OK` — the updated recipe object

**Errors:**
- `400` — Invalid UUID or validation error
- `404` — Recipe not found

```bash
curl -X PUT \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Garlic Pasta (Updated)",
    "ingredients": [
      { "name": "spaghetti", "quantity": "400", "unit": "g" },
      { "name": "garlic", "quantity": "6", "unit": "cloves" }
    ],
    "tags": ["dinner", "quick", "garlic"],
    "servings": 4
  }' \
  https://example.com/api/recipes/550e8400-e29b-41d4-a716-446655440000
```

---

### Delete Recipe

```
DELETE /api/recipes/:id
```

**Response:** `204 No Content`

**Errors:**
- `400` — Invalid UUID format
- `404` — Recipe not found

```bash
curl -X DELETE \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://example.com/api/recipes/550e8400-e29b-41d4-a716-446655440000
```

---

### Get Current Meal Plan

```
GET /api/plan/current
```

Returns the most recently generated meal plan.

**Response:** `200 OK`

```json
{
  "id": "plan-uuid",
  "dinners": [
    {
      "day": "Monday",
      "recipeName": "Chicken Tikka Masala",
      "recipeId": "recipe-uuid",
      "servings": 4,
      "alternativeNote": "Kid alternative: plain rice with butter"
    }
  ],
  "groceryList": [
    { "item": "chicken breast", "quantity": "500g" },
    { "item": "tikka paste", "quantity": "3 tbsp" }
  ],
  "weekOf": "2026-04-06",
  "created_at": "2026-04-04T12:00:00.000Z"
}
```

**Errors:**
- `404` — No meal plan found

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://example.com/api/plan/current
```

---

### Generate Meal Plan

```
POST /api/generate-plan
```

Generates a new 5-dinner meal plan using Gemini AI (or a demo plan if Gemini is not configured).

**Request body (optional):**

| Field         | Type   | Required | Description                              |
|---------------|--------|----------|------------------------------------------|
| `preferences` | string | no       | Dietary preferences (max 500 characters) |

**Response:** `200 OK`

```json
{
  "success": true,
  "plan": { "...meal plan object..." },
  "emailSent": true,
  "emailError": null
}
```

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "preferences": "No shellfish, kid-friendly options" }' \
  https://example.com/api/generate-plan
```

---

## Error Response Format

All errors return JSON with an `error` field:

```json
{ "error": "Description of what went wrong" }
```

Common status codes:
- `400` — Bad request (validation, invalid ID format)
- `401` — Unauthorized (missing or invalid Bearer token)
- `404` — Resource not found
- `500` — Internal server error

## Notes for NanoClaw Integration

- **Field naming uses underscores**: `prep_time`, `cook_time`, `source_url` — not camelCase
- **Recipe name field is `name`**, not `title`
- **Tags are a JSON array of strings** in the database; use the `tag` query param to filter
- **Auth is opt-in**: when `CRON_SECRET` is empty, all endpoints work without auth headers. In production with `CRON_SECRET` set, include the Bearer token on every request
- **No webhook**: poll `GET /api/plan/current` after the Sunday cron to fetch the latest plan
