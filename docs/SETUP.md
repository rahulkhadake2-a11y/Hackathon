# 🚀 Quick Setup Guide

Get the Vendor Risk Management application running in under 5 minutes.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js** v18+ installed ([download](https://nodejs.org/))
- [ ] **npm** v9+ (comes with Node.js)
- [ ] **Git** installed ([download](https://git-scm.com/))
- [ ] **Angular CLI** v19+ (optional, will use npx if not installed)

### Verify Installation

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version (should be 9+)
npm --version

# Check Git
git --version
```

---

## ⚡ Quick Start (3 Steps)

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/vendor-risk-management.git
cd vendor-risk-management

# Install dependencies
npm install
```

### Step 2: Start the Application

```bash
# Start both frontend and API server
npm run start:all
```

### Step 3: Open in Browser

Navigate to: **http://localhost:4200**

That's it! 🎉

---

## 📋 Detailed Setup

### Option A: Run Everything Together (Recommended)

```bash
npm run start:all
```

This single command starts:
- ✅ Angular development server on `http://localhost:4200`
- ✅ JSON Server API on `http://localhost:3000`

### Option B: Run Separately (For Development)

**Terminal 1 - API Server:**
```bash
npm run api
```

**Terminal 2 - Angular App:**
```bash
npm start
```

---

## 🔑 Configure AI Features (Optional)

To enable AI-powered risk analysis:

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

### 2. Add API Key to the Application

Open `src/app/core/services/ai-risk-analysis/ai-risk-analysis.service.ts` and replace:

```typescript
private readonly GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
```

> ⚠️ **Note**: Never commit API keys to version control. For production, use environment variables.

---

## 🗄️ Database Setup

The application uses `db.json` as its database. It should already exist in the project root.

### If db.json is Missing

Create a new one:

```bash
cat > db.json << 'EOF'
{
  "vendors": [],
  "purchases": [],
  "items": [],
  "vendorItems": [],
  "riskanalysis": []
}
EOF
```

### Use Demo Data

Copy the backup file with demo data:

```bash
cp db-backup.json db.json
```

### Verify Database

```bash
# Start API and check endpoints
npm run api

# In another terminal, test the API
curl http://localhost:3000/vendors
```

---

## 📁 Project Structure Overview

```
vendor-risk-management/
├── src/
│   ├── app/
│   │   ├── core/           # Services & models
│   │   ├── pages/          # Page components
│   │   └── shared/         # Reusable components
│   ├── index.html
│   └── main.ts
├── db.json                  # Database file
├── package.json             # Dependencies
└── angular.json             # Angular config
```

---

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `npm run start:all` | Start both Angular and API server |
| `npm start` | Start Angular dev server only |
| `npm run api` | Start JSON Server API only |
| `npm test` | Run unit tests |
| `npm run build` | Build for production |

---

## 🌐 Application URLs

| Service | URL | Description |
|---------|-----|-------------|
| **App** | http://localhost:4200 | Main application |
| **API** | http://localhost:3000 | REST API |
| **Vendors API** | http://localhost:3000/vendors | Vendors endpoint |
| **Purchases API** | http://localhost:3000/purchases | Purchases endpoint |
| **Items API** | http://localhost:3000/items | Items catalog |

---

## 🔍 Verify Everything Works

After starting the application:

1. **Open** http://localhost:4200 in your browser
2. **You should see** the login page
3. **Click** on any navigation to proceed to dashboard
4. **Check** that dashboard loads with metrics
5. **Navigate** to Vendors to see the vendor list

### Test API Connection

```bash
# Get all vendors
curl http://localhost:3000/vendors | head -50

# Get all purchases
curl http://localhost:3000/purchases | head -50
```

---

## ❓ Troubleshooting

### Port Already in Use

```bash
# Kill process on port 4200
lsof -ti:4200 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### npm Install Fails

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### JSON Server Won't Start

```bash
# Reinstall json-server
npm uninstall json-server
npm install json-server@1.0.0-beta.3 --save-dev
```

### Angular CLI Not Found

```bash
# Use npx instead
npx ng serve

# Or install globally
npm install -g @angular/cli@19
```

### Database (db.json) Errors

```bash
# Validate JSON syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('db.json', 'utf8')))"

# If corrupt, restore from backup
cp db-backup.json db.json
```

---

## 📚 Additional Documentation

- [README.md](../README.md) - Full documentation
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) - Architecture details
- [docs/DATABASE.md](DATABASE.md) - Database schema

---

## 🆘 Need Help?

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the console for error messages
3. Open an issue on GitHub

---

Happy coding! 🚀
