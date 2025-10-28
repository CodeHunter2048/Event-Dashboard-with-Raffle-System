# Event Dashboard with Raffle System

A comprehensive event management system built with Next.js, Firebase, and modern web technologies. This application provides a complete solution for managing event attendees, conducting raffles, and monitoring event analytics.

> **Development Timeline:** Created within 5 days with AI assistance
> 
> **AI Tools Used:**
> - **Claude Sonnet 3.5** - Initial project flow and ideation
> - **Firebase Studio IDE with Gemini 2.0 Flash** - UI/UX design and architecture
> - **Claude Sonnet 3.5 via GitHub Copilot** - Code implementation in VS Code
> - **ChatGPT** - Development guidance and problem-solving

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Core Features](#core-features)
- [Security](#security)
- [AI Integration](#ai-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Event Management
- **Attendee Management**: Register, import (CSV), and manage event participants
- **Check-in System**: QR code-based check-in with real-time updates
- **User Accounts**: Multi-role system (Admin, Staff, Display)
- **Analytics Dashboard**: Real-time event statistics and insights

### Raffle System
- **Prize Management**: Create and manage raffle prizes with images
- **Live Drawing**: Conduct fair and transparent raffle drawings
- **Display Mode**: Large screen display for live events
- **Winner Tracking**: Maintain complete history of winners

### Security & Monitoring
- **AI-Powered Monitoring**: Suspicious activity detection using Genkit AI
- **Role-Based Access Control**: Secure access levels for different user types
- **Firebase Authentication**: Secure user authentication and authorization
- **Audit Logs**: Track all critical system activities

## 🛠 Tech Stack

### Frontend
- **Next.js 15.1.6** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization
- **Lucide React** - Icon system

### Backend & Database
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Storage** - File storage for prize images
- **Firebase Admin SDK** - Server-side operations
- **Firebase Authentication** - User management

### AI & Automation
- **Google Genkit** - AI workflow framework
- **Google Generative AI** - AI models integration
- **Genkit Next.js Plugin** - Seamless AI integration

### Additional Tools
- **html5-qrcode** - QR code scanning
- **jsPDF** - PDF generation
- **date-fns** - Date manipulation
- **React Hook Form** - Form management
- **Zod** - Schema validation

## 📁 Project Structure

```
Event-Dashboard-with-Raffle-System/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/                # Admin routes
│   │   ├── dashboard/            # Main dashboard
│   │   │   ├── add-user/         # User creation
│   │   │   ├── analytics/        # Event analytics
│   │   │   ├── attendees/        # Attendee management
│   │   │   ├── check-in/         # Check-in system
│   │   │   ├── drawing/          # Raffle drawing
│   │   │   ├── manage-accounts/  # Account management
│   │   │   ├── prizes/           # Prize management
│   │   │   └── security/         # Security monitoring
│   │   ├── display/              # Large screen display mode
│   │   └── login/                # Authentication
│   ├── ai/                       # AI flows and configuration
│   │   └── flows/                # Genkit AI workflows
│   ├── components/               # React components
│   │   └── ui/                   # Reusable UI components
│   ├── firebase/                 # Firebase configuration
│   ├── hooks/                    # Custom React hooks
│   └── lib/                      # Utility functions
├── public/                       # Static assets
│   └── prizes/                   # Prize images
├── scripts/                      # Utility scripts
├── docs/                         # Documentation
└── [config files]                # Various configuration files
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase project with Firestore and Storage enabled
- Firebase Admin SDK credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Event-Dashboard-with-Raffle-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Firebase Storage
   - Enable Firebase Authentication (Email/Password)
   - Download service account key (for admin SDK)

4. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Client Config
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin SDK (Base64 encoded service account JSON)
   FIREBASE_SERVICE_ACCOUNT=your_base64_encoded_service_account

   # Google AI
   GOOGLE_GENAI_API_KEY=your_google_ai_api_key
   ```

5. **Initialize Firestore security rules**
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage:rules
   ```

6. **Create the first admin user**
   ```bash
   npm run dev
   ```
   Then navigate to `/admin/create-user` (first-time setup only)

### Running the Application

**Development Mode:**
```bash
npm run dev
```
The app will be available at `http://localhost:9002`

**Production Build:**
```bash
npm run build
npm start
```

**AI Development Mode:**
```bash
npm run genkit:dev
```

## ⚙️ Configuration

### Firebase Setup

Refer to `FIREBASE_STORAGE_SETUP.md` for detailed Firebase Storage configuration.

### Import Attendees

See `IMPORT_GUIDE.md` for instructions on importing attendees via CSV. Template available at `attendees_template.csv`.

### User Roles

The system supports three user roles:
- **Admin**: Full system access
- **Staff**: Attendee and check-in management
- **Display**: Read-only display mode for large screens

## 🎯 Core Features

### 1. Attendee Management
- Bulk import via CSV
- Individual registration
- Search and filter capabilities
- QR code generation for each attendee
- Export attendee lists

### 2. Check-in System
- QR code scanning (camera-based)
- Manual check-in option
- Real-time check-in status
- Check-in analytics and reporting

### 3. Raffle System
- Create multiple prizes with details and images
- Fair random drawing algorithm
- Live drawing animation
- Display mode for audience viewing
- Winner history and verification

### 4. Analytics Dashboard
- Total attendees count
- Check-in rate tracking
- Prize distribution analytics
- Real-time updates
- Visual charts and graphs

### 5. Security Monitoring
- AI-powered suspicious activity detection
- Check-in pattern analysis
- Anomaly alerts
- Activity audit logs

## 🔒 Security

### Authentication
- Firebase Authentication with email/password
- Protected routes with middleware
- Role-based access control (RBAC)
- Session management

### Data Security
- Firestore security rules for data access control
- Storage rules for file uploads
- Server-side validation
- HTTPS enforcement

### AI Monitoring
The system uses Google Genkit to analyze check-in patterns and detect:
- Multiple rapid check-ins from same device
- Unusual check-in patterns
- Potential security breaches

## 🤖 AI Integration

### Genkit Flows

**Suspicious Check-in Detection:**
```typescript
// src/ai/flows/detect-suspicious-checkins.ts
```
Analyzes check-in data to identify potential fraudulent activities using Google's Generative AI.

### Running AI Workflows
```bash
npm run genkit:dev
```
Access the Genkit Developer UI at `http://localhost:4000`

## 🌐 Deployment

### Vercel (Current Hosting)

This project is deployed on **Vercel**, the recommended platform for Next.js applications.

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Select the `Event-Dashboard-with-Raffle-System` repository

2. **Configure Environment Variables**
   Add the following environment variables in Vercel project settings:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   FIREBASE_SERVICE_ACCOUNT
   GOOGLE_GENAI_API_KEY
   ```

3. **Deploy**
   - Vercel automatically deploys on every push to `main` branch
   - Preview deployments are created for pull requests
   - Manual deployment: Click "Deploy" in Vercel dashboard

**Benefits of Vercel:**
- ✅ Automatic CI/CD from GitHub
- ✅ Edge network for fast global delivery
- ✅ Serverless functions for API routes
- ✅ Zero-config Next.js optimization
- ✅ Free SSL certificates
- ✅ Preview deployments for testing

See `COMING_SOON_DEPLOY.md` for additional deployment considerations.

### Alternative Platforms
- Firebase Hosting
- Netlify
- Google Cloud Run
- Self-hosted with Node.js

## 📊 Database Schema

### Collections

**attendees**
- `id`: string
- `name`: string
- `email`: string
- `phone`: string
- `organization`: string
- `checkedIn`: boolean
- `checkInTime`: timestamp
- `qrCode`: string

**prizes**
- `id`: string
- `name`: string
- `description`: string
- `imageUrl`: string
- `quantity`: number
- `category`: string
- `createdAt`: timestamp

**winners**
- `id`: string
- `attendeeId`: string
- `prizeId`: string
- `drawnAt`: timestamp
- `claimedAt`: timestamp (optional)

**users**
- `id`: string
- `email`: string
- `displayName`: string
- `role`: 'admin' | 'staff' | 'display'
- `createdAt`: timestamp

## 🎨 UI Components

Built with Radix UI and Tailwind CSS, the system includes:
- Responsive tables
- Modal dialogs
- Alert systems
- Form components
- Charts and graphs
- Theme toggle (light/dark mode)
- Accessible navigation

## 📝 Development Notes

### Key Files
- `src/lib/firebase.ts` - Firebase client configuration
- `src/lib/firebase-admin.ts` - Firebase Admin SDK setup
- `src/app/dashboard/layout.tsx` - Main dashboard layout
- `src/components/withAuth.tsx` - Authentication HOC
- `src/hooks/use-auth.ts` - Authentication hook

### Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run genkit:dev` - Start Genkit development server

## 🤝 Contributing

This project was created as a rapid prototype with AI assistance. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

This project was developed with the assistance of multiple AI tools:
- **Claude Sonnet 3.5** for architectural planning and code generation
- **Gemini 2.0 Flash (Firebase Studio)** for design and UI components
- **GitHub Copilot** for code completion and suggestions
- **ChatGPT** for guidance and problem-solving

Special thanks to the open-source community and the following technologies:
- Next.js team for the amazing framework
- Firebase team for the backend infrastructure
- Radix UI for accessible components
- Vercel for hosting solutions

## 📄 License

This project is created for educational and demonstration purposes.

---

**Project Status:** Production Ready (Created in 5 days)

**Last Updated:** October 2025

For questions, issues, or feature requests, please open an issue on GitHub.
