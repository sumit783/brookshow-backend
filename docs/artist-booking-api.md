# Artist Booking API Documentation

## Endpoint
`POST /api/planner/bookings/artist`

## Description
Creates a new artist booking for a planner. The booking is paid from the planner's wallet balance. Payment gateway integration will be added later.

## Authentication
Requires authentication token (Bearer token)

## Request Headers
```
Authorization: Bearer <token>
X-API-Key: <api-key>
Content-Type: application/json
```

## Request Body
```json
{
  "artistId": "string (ObjectId, required)",
  "serviceId": "string (ObjectId, required)",
  "eventId": "string (ObjectId, optional)",
  "startAt": "string (ISO date, required)",
  "endAt": "string (ISO date, required)"
}
```

### Field Descriptions
- **artistId**: MongoDB ObjectId of the artist to book
- **serviceId**: MongoDB ObjectId of the service offered by the artist
- **eventId**: (Optional) MongoDB ObjectId of the event this booking is for
- **startAt**: Start date and time of the booking (ISO 8601 format)
- **endAt**: End date and time of the booking (ISO 8601 format)

## Validation Rules
1. All required fields must be provided
2. ObjectIds must be valid MongoDB ObjectIds
3. Dates must be valid ISO 8601 format
4. End date must be after start date
5. Start date cannot be in the past
6. Artist must exist in the database
7. Service must exist and belong to the specified artist
8. Artist must be available for the requested dates (no conflicting bookings)
9. Planner must have sufficient wallet balance

## Response

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Artist booking created successfully",
  "booking": {
    "_id": "string",
    "clientId": "string",
    "artistId": {
      "userId": "string",
      "bio": "string",
      "category": ["string"],
      "location": {
        "city": "string",
        "state": "string",
        "country": "string"
      }
    },
    "serviceId": {
      "category": "string",
      "unit": "hour|day|event",
      "price_for_planner": "number"
    },
    "eventId": {
      "title": "string",
      "startAt": "date",
      "endAt": "date"
    },
    "source": "planner",
    "startAt": "date",
    "endAt": "date",
    "totalPrice": "number",
    "status": "confirmed",
    "paymentStatus": "paid",
    "createdAt": "date",
    "updatedAt": "date"
  },
  "remainingBalance": "number"
}
```

### Error Responses

#### 400 Bad Request - Missing Fields
```json
{
  "success": false,
  "message": "Artist ID, Service ID, start date, and end date are required"
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

#### 400 Bad Request - Past Date
```json
{
  "success": false,
  "message": "Start date cannot be in the past"
}
```

#### 400 Bad Request - Insufficient Balance
```json
{
  "success": false,
  "message": "Insufficient wallet balance",
  "required": 5000,
  "available": 3000
}
```

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

#### 409 Conflict - Artist Not Available
```json
{
  "success": false,
  "message": "Artist is not available for the selected dates",
  "conflictingBooking": {
    "startAt": "2025-12-20T10:00:00.000Z",
    "endAt": "2025-12-22T18:00:00.000Z"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create artist booking"
}
```

## Example Usage

### Example Request
```bash
curl -X POST https://api.example.com/api/planner/bookings/artist \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "artistId": "6756a1b2c3d4e5f6a7b8c9d0",
    "serviceId": "6756a1b2c3d4e5f6a7b8c9d1",
    "eventId": "6756a1b2c3d4e5f6a7b8c9d2",
    "startAt": "2025-12-25T10:00:00.000Z",
    "endAt": "2025-12-25T18:00:00.000Z"
  }'
```

## Business Logic

### Price Calculation
The total price is calculated based on:
1. **Service Unit**: hour, day, or event
2. **Duration**: Time difference between startAt and endAt
3. **Price**: Uses `price_for_planner` if available, otherwise falls back to `price_for_user`

**Calculation Examples:**
- **Hour-based**: If service is ₹500/hour and booking is 8 hours → Total: ₹4,000
- **Day-based**: If service is ₹5,000/day and booking is 3 days → Total: ₹15,000
- **Event-based**: Flat rate regardless of duration → Total: Service price

### Payment Flow
1. Validates planner has sufficient wallet balance
2. Creates booking with status "confirmed" and paymentStatus "paid"
3. Deducts total price from planner's wallet
4. Creates a wallet transaction record
5. Adds booking to artist's bookings array

### Availability Check
The system checks for conflicting bookings where:
- Booking status is "pending" or "confirmed"
- Date ranges overlap with the requested dates

## Notes
- Payment gateway integration is **not implemented** in this version
- Bookings are automatically confirmed when created (paid from wallet)
- The planner's wallet balance is immediately deducted
- A transaction record is created for accounting purposes
- Future enhancement: Add payment gateway for advance payments or deposits
