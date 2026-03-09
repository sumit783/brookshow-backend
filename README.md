# BrookShow Backend

### Your Entertainment & Booking Platform Backend

BrookShow is a robust backend system designed to power an entertainment and booking platform. It facilitates connections between Artists, Planners, and Users, handling everything from service discovery and event booking to secure payments and real-time notifications.

---

## Core Features

- **Multi-Role Authentication**: OTP-based login and registration for Users, Artists, and Planners.
- **Service Management**: Artists can list services (e.g., performances, workshops) with pricing and descriptions.
- **Event Planning**: Planners can manage events, ticketing, and bookings.
- **Secure Payments**: Integration with Razorpay for handling transactions and booking fees.
- **Financial Management**: Automated commission calculations, wallet transactions, and withdrawal requests for service providers.
- **Calendar & Availability**: Tools for artists to block specific dates and manage their schedules.
- **Admin Dashboard**: Comprehensive control over users, verifying service providers, and platform settings.

---

## Project Structure

The project follows a standard Express.js modular architecture:

- `src/server.js`: The entry point of the application, handles server initialization and database connection.
- `src/app.js`: Main Express application configuration, middleware setup, and route definitions.
- `src/models/`: Mongoose schemas for all entities (Users, Artists, Bookings, Tickets, etc.).
- `src/controllers/`: Business logic for handling API requests.
- `src/routes/`: API endpoint definitions mapped to their respective controllers.
- `src/middlewares/`: Global and route-specific middleware (auth, API key validation, error handling).
- `src/utils/`: Helper functions (OTP generation, token management, file uploads, cron jobs).

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Auth & Storage**: Supabase (for Admin auth & static assets)
- **Payment Gateway**: Razorpay
- **Communication**: Twilio (SMS OTP) & Nodemailer (Email OTP)
- **Security**: Helmet, CORS, Rate Limiting, JWT

---

## Operational Flow

### 1. Authentication Flow
- **User/Artist/Planner**: Enters Email/Phone $\rightarrow$ Receives OTP $\rightarrow$ Verifies OTP $\rightarrow$ Receives JWT Access Token.
- **Admin**: Login via Email & Password (authenticated via Supabase).

### 2. Service & Booking Flow
- **Service Listing**: Artists create services in their profile.
- **Discovery**: Users browse services or events.
- **Booking**: User selects a service $\rightarrow$ Initiates booking $\rightarrow$ Completes payment (Razorpay) $\rightarrow$ Booking status is confirmed.
- **Execution**: Service is performed on the scheduled date.

### 3. Financial Flow
- **Payment Processing**: User pays the full amount at the time of booking.
- **Commission**: The platform automatically calculates and deducts its commission.
- **Payout**: Net earnings are credited to the Artist/Planner's wallet.
- **Withdrawal**: Providers can request withdrawals to their linked bank accounts, which admins approve.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB instance (Local or Atlas)
- `.env` file with necessary credentials (see `.env.example`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sumit783/brookshow-backend.git
   cd brookshow-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your `MONGO_URI`, `RAZORPAY_KEY`, `TWILIO` credentials, etc.

4. Run the application:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

---

## License
This project is licensed under the [ISC License](LICENSE).