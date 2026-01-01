# 🏥 Nursify - Healthcare Management Platform

A comprehensive healthcare platform connecting patients with professional nurses and caretakers. Built with React Native (Expo), Node.js, Express, and MongoDB.

## 🌟 Features

### For Patients
- 📱 Easy booking of healthcare professionals
- 🔍 Browse qualified nurses and caretakers
- 📍 Real-time service tracking
- 💳 Secure payment processing
- ⭐ Review and rating system

### For Healthcare Professionals (Nurses & Caretakers)
- 📋 Professional profile management
- 📄 Document verification system
- 💼 Booking management
- 📊 Earnings tracking
- 🔔 Real-time notifications

### Admin Dashboard
- ✅ User verification and approval
- 👥 User management
- 📈 Analytics and reporting
- 💰 Payment oversight
- 🛡️ Safety monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account
- Expo CLI
- Android/iOS device or emulator

### ✨ Automatic IP Detection

This project features automatic network IP detection! No manual configuration needed when switching networks.

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/nursify.git
cd nursify
```

2. **Install dependencies**
```bash
# Install server dependencies
cd Server
npm install

# Install admin portal dependencies
cd "../Admin Portal"
npm install

# Install mobile app dependencies
cd ../App
npm install
```

3. **Configure environment variables**

Create a `.env` file in the `Server` folder:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_secret_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_SECURE=true

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# This is auto-updated when server starts
SERVER_IP=192.168.1.1
```

4. **Start all services**

**Option 1: One-click start (Windows)**
```bash
START_ALL.bat
```

**Option 2: Manual start**
```bash
# Start backend server (auto-detects IP)
cd Server
npm start

# Start admin portal (in new terminal)
cd "Admin Portal"
npm run dev

# Start mobile app (in new terminal)
cd App
npx expo start
```

## 📁 Project Structure

```
Nursify/
├── Server/                 # Backend API (Node.js + Express)
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Auth & validation middleware
│   ├── config/            # Configuration files
│   ├── scripts/           # Utility scripts (IP detection, etc.)
│   └── .env              # Environment variables
│
├── App/                   # Mobile Application (React Native + Expo)
│   ├── screens/           # App screens
│   ├── components/        # Reusable components
│   ├── services/          # API services
│   ├── config/            # App configuration
│   └── assets/            # Images, fonts, etc.
│
├── Admin Portal/          # Admin Dashboard (React + TypeScript + Vite)
│   ├── src/
│   │   ├── pages/         # Dashboard pages
│   │   ├── components/    # UI components
│   │   └── config/        # API configuration
│   └── public/            # Static assets
│
├── START_ALL.bat          # One-click startup script
├── QUICK_START.md         # Quick reference guide
└── ADMIN_CREDENTIALS.md   # Admin login details
```

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT + bcrypt
- **File Upload**: Cloudinary + Multer
- **Email**: Nodemailer
- **Validation**: Zod

### Mobile App
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS)
- **HTTP Client**: Axios
- **Storage**: AsyncStorage

### Admin Portal
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification

### Patient Routes
- `GET /api/patient/caregivers` - Get available caregivers
- `POST /api/patient/booking` - Create booking
- `GET /api/patient/bookings` - Get user bookings

### Caregiver Routes
- `GET /api/caregiver/bookings` - Get caregiver bookings
- `PATCH /api/caregiver/booking/:id/status` - Update booking status
- `PATCH /api/caregiver/availability` - Update availability

### Admin Routes
- `GET /api/admin/users/pending` - Get pending verifications
- `PATCH /api/admin/users/approve/:id` - Approve user
- `PATCH /api/admin/users/reject/:id` - Reject user
- `GET /api/admin/users` - Get all users

## 🔐 Admin Access

Default admin credentials (⚠️ **change after first login**):
- **Email**: admin@nursify.com
- **Password**: admin123

## 🎨 Features in Detail

### Automatic IP Detection
- Network IP is automatically detected on server startup
- All configs (Server, App, Admin Portal) are updated automatically
- Works seamlessly when switching networks
- Run `npm run update-ip` in Server folder to manually update

### User Verification System
- CNIC validation for all users
- License verification for nurses
- Admin approval workflow for healthcare professionals
- Document upload and review system

### Booking System
- Real-time availability checking
- Service scheduling
- Status tracking (pending, confirmed, in-progress, completed)
- Payment integration ready

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Patient, Nurse, Caretaker, Admin)
- Email verification
- Admin approval for healthcare professionals

## 🧪 Testing

### Test Admin User
```bash
cd Server
node check-admin.js
```

### Test Registration
```bash
cd Server
node test-registration.js
```

### Test Booking Flow
```bash
cd Server
node test-booking.js
```

## 🐛 Troubleshooting

### Network Issues
- Ensure all services are on the same network
- Check firewall settings for port 5000
- Run `npm run update-ip` if IP changed

### Database Connection
- Verify MongoDB URI in `.env`
- Check MongoDB Atlas whitelist includes your IP
- Ensure network connectivity

### Image Upload Issues
- Verify Cloudinary credentials in `.env`
- Check supported formats (jpg, png, jpeg, heic, heif, pdf)
- Ensure file size is under 10MB

### Admin Login Issues
- Run `node createAdmin.js` to recreate admin user
- Verify correct IP in Admin Portal config
- Check browser console for errors

## 📝 Environment Variables

Required variables in `Server/.env`:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET_KEY` - Secret for JWT tokens
- `SMTP_HOST` - Email server host
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password (use app password for Gmail)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `SERVER_IP` - Auto-detected network IP

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👥 Team

Developed with ❤️ by the Nursify Team

## 📞 Support

For support, email nursifyautoreply@gmail.com or open an issue on GitHub.

---

**Happy Coding! 🎉**
