# Provider Ratings API

## Overview
5-star rating system for signal providers with reviews and average calculation.

## Endpoints

### Submit/Update Rating
```http
POST /providers/:id/rate?userId=<uuid>
Content-Type: application/json

{
  "stars": 5,
  "review": "Excellent provider with consistent results!"
}
```

**Response:**
```json
{
  "id": "rating-uuid",
  "userId": "user-uuid",
  "providerId": "provider-uuid",
  "stars": 5,
  "review": "Excellent provider with consistent results!",
  "createdAt": "2024-01-19T10:00:00Z",
  "updatedAt": "2024-01-19T10:00:00Z"
}
```

### Get Provider Ratings
```http
GET /providers/:id/ratings?page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "rating-uuid",
      "userId": "user-uuid",
      "providerId": "provider-uuid",
      "stars": 5,
      "review": "Great signals!",
      "createdAt": "2024-01-19T10:00:00Z",
      "updatedAt": "2024-01-19T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

### Get Rating Summary
```http
GET /providers/:id/ratings/summary
```

**Response:**
```json
{
  "averageRating": 4.5,
  "totalRatings": 50,
  "starDistribution": {
    "1": 2,
    "2": 3,
    "3": 5,
    "4": 15,
    "5": 25
  }
}
```

### Get User's Rating
```http
GET /providers/:id/ratings/user?userId=<uuid>
```

**Response:**
```json
{
  "id": "rating-uuid",
  "userId": "user-uuid",
  "providerId": "provider-uuid",
  "stars": 5,
  "review": "Excellent!",
  "createdAt": "2024-01-19T10:00:00Z",
  "updatedAt": "2024-01-19T10:00:00Z"
}
```

### Delete Rating
```http
DELETE /providers/:id/ratings?userId=<uuid>
```

**Response:**
```json
{
  "message": "Rating deleted successfully"
}
```

## Features

- ✅ 5-star rating scale (1-5)
- ✅ Optional text reviews (max 1000 characters)
- ✅ One rating per user per provider (unique constraint)
- ✅ Update existing ratings
- ✅ Average rating calculation
- ✅ Star distribution statistics
- ✅ Pagination support
- ✅ Input validation

## Validation Rules

- `stars`: Required, integer between 1-5
- `review`: Optional, string, max 1000 characters
- `userId`: Required in query parameters
- `providerId`: Required in URL path

## Database Schema

```sql
CREATE TABLE provider_ratings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider_id)
);

CREATE INDEX idx_provider_ratings_user_id ON provider_ratings(user_id);
CREATE INDEX idx_provider_ratings_provider_id ON provider_ratings(provider_id);
```

## Usage Examples

### Submit a rating
```bash
curl -X POST http://localhost:3000/api/v1/providers/provider-123/rate?userId=user-456 \
  -H "Content-Type: application/json" \
  -d '{"stars": 5, "review": "Amazing signals!"}'
```

### Get ratings summary
```bash
curl http://localhost:3000/api/v1/providers/provider-123/ratings/summary
```

### Update existing rating
```bash
curl -X POST http://localhost:3000/api/v1/providers/provider-123/rate?userId=user-456 \
  -H "Content-Type: application/json" \
  -d '{"stars": 4, "review": "Updated review"}'
```