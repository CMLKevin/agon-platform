# PhantomPay

A modern, minimalistic payment system for the Stoneworks Minecraft server, built with React and Node.js.

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- 💰 **Dual Currency System** - PhantomCoin and Stoneworks Dollar
- 🔄 **Currency Swap** - Exchange currencies at 1:1 ratio
- 💸 **Peer-to-Peer Payments** - Send payments to other users
- 📊 **Transaction History** - Track all your transactions
- 👥 **User Directory** - Browse and search all registered users
- 🎨 **Modern UI** - Professional, minimalistic design inspired by Phantom

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js
- Express
- SQLite
- JWT Authentication
- bcrypt

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd PhantomPay
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   PORT=3001
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   NODE_ENV=development
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 3001) and frontend client (port 3000).

   Alternatively, you can start them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run client
   ```

5. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
PhantomPay/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Main application pages
│   │   ├── services/     # API service layer
│   │   ├── context/      # React context (Auth)
│   │   ├── utils/        # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                # Express backend
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Business logic
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Authentication middleware
│   │   └── server.js     # Main server file
│   ├── database.db       # SQLite database (auto-generated)
│   └── package.json
├── package.json          # Root package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login to an existing account
- `GET /api/auth/profile` - Get current user profile (protected)

### Wallet
- `GET /api/wallet` - Get wallet balances (protected)
- `POST /api/wallet/swap` - Swap between currencies (protected)

### Payments
- `POST /api/payment/send` - Send payment to another user (protected)
- `GET /api/payment/transactions` - Get transaction history (protected)

### Users
- `GET /api/users` - Get all users (protected)
- `GET /api/users/search` - Search users by username (protected)

## Usage

### Creating an Account

1. Navigate to the signup page
2. Enter your Minecraft username and create a password
3. You'll receive 1,000 PhantomCoin and 1,000 Stoneworks Dollars as a welcome bonus

### Sending Payments

1. Go to the "Send" page
2. Select a recipient from the dropdown
3. Choose the currency (PhantomCoin or Stoneworks Dollar)
4. Enter the amount and an optional description
5. Click "Send Payment"

### Swapping Currency

1. Go to the "Swap" page
2. Select the currency you want to swap from
3. Select the currency you want to receive
4. Enter the amount
5. Click "Swap Currency"

Currency swaps occur at a 1:1 ratio.

### Viewing Users

1. Go to the "Users" page
2. Browse all registered users
3. Use the search bar to find specific users
4. Click "Send Payment" next to any user to quickly send them funds

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique Minecraft username
- `password` - Hashed password
- `created_at` - Account creation timestamp

### Wallets Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `phantom_coin` - PhantomCoin balance
- `stoneworks_dollar` - Stoneworks Dollar balance

### Transactions Table
- `id` - Primary key
- `from_user_id` - Sender user ID
- `to_user_id` - Recipient user ID (null for swaps)
- `transaction_type` - Type: 'payment' or 'swap'
- `currency` - Currency used
- `amount` - Transaction amount
- `description` - Optional description
- `created_at` - Transaction timestamp

## Future Enhancements

PhantomPay is designed with modularity in mind. Planned future features include:

- 📈 **Stock Market** - Trade virtual stocks with PhantomCoin
- 💵 **Bonds** - Purchase and trade bonds
- 🏦 **Loans** - Borrow and lend between users
- 📱 **Mobile App** - Native mobile application
- 🔗 **Minecraft Integration** - Direct integration with Minecraft server
- 📊 **Analytics Dashboard** - Detailed spending and earning insights
- 🔔 **Notifications** - Real-time transaction notifications
- 👥 **User Profiles** - Enhanced user profiles with avatars
- 🎁 **Gift Cards** - Create and redeem gift cards
- 🔒 **Two-Factor Authentication** - Enhanced security

## Development

### Building for Production

```bash
npm run build
```

This will create optimized production builds in the `client/dist` directory.

### Running in Production

```bash
npm start
```

This will start the production server on port 3001.

## Security Notes

⚠️ **Important**: Before deploying to production:

1. Change the `JWT_SECRET` in your `.env` file to a strong, random string
2. Use environment variables for all sensitive configuration
3. Enable HTTPS/SSL
4. Implement rate limiting
5. Add input sanitization
6. Set up proper CORS policies
7. Use a production-grade database (PostgreSQL, MySQL)
8. Implement proper logging and monitoring

## License

MIT License - Feel free to use this project for your Minecraft server!

## Support

For issues, questions, or feature requests, please create an issue in the repository.

---

Built with ❤️ for the Stoneworks Minecraft Server

