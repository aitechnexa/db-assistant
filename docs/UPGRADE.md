# Upgrade Guide - New Features

## 🎉 What's New

Your Database Query Assistant has been upgraded with powerful new features:

1. ✅ **Edit Database Credentials** - Update existing connections
2. ✅ **Connection Status Indicators** - Real-time health monitoring
3. ✅ **User Authentication** - Secure login system
4. ✅ **Dark Mode** - Easy on the eyes
5. ✅ **Keyboard Shortcuts** - Power user features
6. ✅ **Enhanced UI** - Minimalist, attractive design

## 📦 Installation Steps

### 1. Install New Backend Dependencies

```bash
cd backend
pip install passlib[bcrypt]==1.7.4 pyjwt==2.8.0
```

### 2. Restart Backend Server

```bash
# Stop the current backend (Ctrl+C)
# Then restart:
python -m app.main
```

### 3. Frontend is Ready!

The frontend will automatically reload with the new features.

## 🔐 Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the default password in production!

## 🎨 New Features Overview

### Edit Database Connections
- Click the **Edit** button (pencil icon) on any database card
- Update credentials and test the connection
- Changes are saved immediately

### Connection Status
- **Green dot** = Connected
- **Red dot** = Disconnected  
- **Gray dot** = Error
- Click **Refresh** icon to check all connections

### Dark Mode
- Click the **Moon/Sun** icon in the header
- Or press `Ctrl+D` (Windows/Linux) or `Cmd+D` (Mac)
- Your preference is saved automatically

### Keyboard Shortcuts
- `Ctrl/Cmd + K` - Focus search input
- `Ctrl/Cmd + D` - Toggle dark mode
- `Enter` - Submit query

## 🚀 Quick Start

1. **Login** with default credentials
2. **Add a database** using the "Add Database" button
3. **Test the connection** before saving
4. **Select a database** from the list
5. **Ask questions** in natural language
6. **Toggle dark mode** for comfortable viewing

## 📝 API Changes

### New Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

**Database Management:**
- `PUT /api/databases/{id}` - Update database (NEW!)
- `GET /api/databases/{id}/status` - Check connection status (NEW!)
- `POST /api/databases/test` - Test connection (EXISTING)

## 🔧 Troubleshooting

### Backend won't start?
```bash
# Make sure you installed the new dependencies
pip install -r requirements.txt
```

### Login not working?
- Check that backend is running on port 8000
- Clear browser localStorage: `localStorage.clear()` in console
- Try the default credentials: admin/admin123

### Dark mode not persisting?
- Check browser localStorage permissions
- Try toggling dark mode twice

### Connection status not showing?
- Click the refresh icon
- Check that databases are properly configured
- Verify backend is accessible

## 📚 Documentation

See `FEATURES.md` for complete documentation of all new features.

## 🎯 Next Steps

1. Change the default admin password
2. Add your database connections
3. Explore the new features
4. Customize the theme (dark/light)
5. Try keyboard shortcuts

Enjoy your enhanced Database Query Assistant! 🚀
