# New Planner API Routes Documentation

## 1. Check Artist Availability with Pricing

### Endpoint
`GET /api/planner/artists/availability/check`

### Description
Checks if an artist is available for a specific date range and returns detailed pricing information. This endpoint should be called before creating a booking to verify availability and show pricing to the user.

### Authentication
Requires authentication token (Bearer token)

### Request Headers
```
Authorization: Bearer <token>
X-API-Key: <api-key>
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| artistId | String (ObjectId) | Yes | MongoDB ObjectId of the artist |
| serviceId | String (ObjectId) | Yes | MongoDB ObjectId of the service |
| startAt | String (ISO Date) | Yes | Start date and time |
| endAt | String (ISO Date) | Yes | End date and time |

### Example Request
```bash
GET /api/planner/artists/availability/check?artistId=6756a1b2c3d4e5f6a7b8c9d0&serviceId=6756a1b2c3d4e5f6a7b8c9d1&startAt=2025-12-25T10:00:00.000Z&endAt=2025-12-25T18:00:00.000Z
```

### Success Response (200 OK)

#### When Artist is Available
```json
{
  "success": true,
  "available": true,
  "artist": {
    "id": "6756a1b2c3d4e5f6a7b8c9d0",
    "category": ["Singer", "Performer"],
    "location": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    }
  },
  "service": {
    "id": "6756a1b2c3d4e5f6a7b8c9d1",
    "category": "Singer",
    "unit": "hour",
    "pricePerUnit": 5000
  },
  "pricing": {
    "pricePerUnit": 5000,
    "units": 8,
    "totalPrice": 40000,
    "currency": "INR"
  },
  "requestedDates": {
    "startAt": "2025-12-25T10:00:00.000Z",
    "endAt": "2025-12-25T18:00:00.000Z"
  },
  "conflictingBooking": null
}
```

#### When Artist is NOT Available
```json
{
  "success": true,
  "available": false,
  "artist": {
    "id": "6756a1b2c3d4e5f6a7b8c9d0",
    "category": ["Singer", "Performer"],
    "location": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    }
  },
  "service": {
    "id": "6756a1b2c3d4e5f6a7b8c9d1",
    "category": "Singer",
    "unit": "hour",
    "pricePerUnit": 5000
  },
  "pricing": {
    "pricePerUnit": 5000,
    "units": 8,
    "totalPrice": 40000,
    "currency": "INR"
  },
  "requestedDates": {
    "startAt": "2025-12-25T10:00:00.000Z",
    "endAt": "2025-12-25T18:00:00.000Z"
  },
  "conflictingBooking": {
    "startAt": "2025-12-25T09:00:00.000Z",
    "endAt": "2025-12-25T17:00:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Parameters
```json
{
  "success": false,
  "message": "Artist ID, Service ID, start date, and end date are required"
}
```

#### 400 Bad Request - Invalid ObjectId
```json
{
  "success": false,
  "message": "Invalid artist or service ID format"
}
```

#### 400 Bad Request - Invalid Date Format
```json
{
  "success": false,
  "message": "Invalid date format"
}
```

#### 400 Bad Request - Invalid Date Range
```json
{
  "success": false,
  "message": "End date must be after start date"
}
```

#### 404 Not Found - Artist
```json
{
  "success": false,
  "message": "Artist not found"
}
```

#### 404 Not Found - Service
```json
{
  "success": false,
  "message": "Service not found for this artist"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to check artist availability"
}
```

---

## 2. Get Planner Events List

### Endpoint
`GET /api/planner/events-list`

### Description
Retrieves a list of all events (title and ID) for the authenticated planner. Events are sorted by start date (newest first). This is useful for dropdowns or selection lists when creating bookings.

### Authentication
Requires authentication token (Bearer token)

### Request Headers
```
Authorization: Bearer <token>
X-API-Key: <api-key>
```

### Query Parameters
None

### Example Request
```bash
GET /api/planner/events-list
```

### Success Response (200 OK)
```json
{
  "success": true,
  "count": 3,
  "events": [
    {
      "id": "6756a1b2c3d4e5f6a7b8c9d0",
      "title": "New Year Music Festival 2026",
      "startAt": "2026-01-01T18:00:00.000Z",
      "endAt": "2026-01-02T02:00:00.000Z",
      "published": true
    },
    {
      "id": "6756a1b2c3d4e5f6a7b8c9d1",
      "title": "Christmas Concert 2025",
      "startAt": "2025-12-25T19:00:00.000Z",
      "endAt": "2025-12-25T23:00:00.000Z",
      "published": true
    },
    {
      "id": "6756a1b2c3d4e5f6a7b8c9d2",
      "title": "Summer Music Night",
      "startAt": "2025-06-15T20:00:00.000Z",
      "endAt": "2025-06-16T01:00:00.000Z",
      "published": false
    }
  ]
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

#### 404 Not Found - Planner Profile
```json
{
  "success": false,
  "message": "Planner profile not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch events"
}
```

---

## Integration with Artist Booking

### Recommended Workflow

1. **Get Events List** (Optional)
   ```
   GET /api/planner/events-list
   ```
   Use this to populate a dropdown for event selection.

2. **Check Availability & Get Pricing**
   ```
   GET /api/planner/artists/availability/check?artistId=...&serviceId=...&startAt=...&endAt=...
   ```
   - Verify artist is available
   - Display pricing to user
   - Show conflicting booking dates if unavailable

3. **Create Booking** (if available)
   ```
   POST /api/planner/bookings/artist
   ```
   Body includes the same parameters plus optional eventId from step 1.

### Frontend Implementation Example

```javascript
// Step 1: Get events for dropdown
const eventsResponse = await fetch('/api/planner/events-list', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-API-Key': apiKey
  }
});
const { events } = await eventsResponse.json();

// Step 2: Check availability when user selects dates
const checkAvailability = async (artistId, serviceId, startAt, endAt) => {
  const params = new URLSearchParams({
    artistId,
    serviceId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString()
  });
  
  const response = await fetch(`/api/planner/artists/availability/check?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-API-Key': apiKey
    }
  });
  
  const data = await response.json();
  
  if (data.available) {
    // Show pricing: data.pricing.totalPrice
    // Enable booking button
  } else {
    // Show conflict: data.conflictingBooking
    // Disable booking button
  }
  
  return data;
};

// Step 3: Create booking
const createBooking = async (artistId, serviceId, eventId, startAt, endAt) => {
  const response = await fetch('/api/planner/bookings/artist', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      artistId,
      serviceId,
      eventId, // optional
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString()
    })
  });
  
  return await response.json();
};
```

## Notes

- The availability check endpoint uses **query parameters** (GET request)
- The booking creation endpoint uses **request body** (POST request)
- Pricing is calculated using `price_for_planner` from the service
- The pricing calculation respects the service unit (hour/day/event)
- Events are sorted by start date in descending order (newest first)
- Both endpoints require planner authentication
