# 🚀 GitHub Setup Guide for Nursify

## Step 1: Install Git

### Windows
1. Download Git from: https://git-scm.com/download/windows
2. Run the installer with default settings
3. Restart your terminal/PowerShell after installation

### Verify Installation
```bash
git --version
```

## Step 2: Configure Git (First Time Only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: **nursify**
3. Description: *Healthcare Management Platform - Connecting patients with nurses and caretakers*
4. Choose **Private** or **Public**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

## Step 4: Initialize and Push to GitHub

Once Git is installed and you've created the GitHub repository, run these commands:

```bash
# Navigate to project folder
cd d:\Nursify

# Initialize Git repository
git init

# Set main branch
git branch -M main

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Nursify Healthcare Platform"

# Add remote repository (replace 'yourusername' with your GitHub username)
git remote add origin https://github.com/yourusername/nursify.git

# Push to GitHub
git push -u origin main
```

## Step 5: Authentication

GitHub will ask for authentication. You have two options:

### Option A: Personal Access Token (Recommended)
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" (classic)
3. Give it a name: "Nursify Development"
4. Select scopes: **repo** (full control)
5. Generate token and **COPY IT** (you won't see it again!)
6. When pushing, use token as password

### Option B: GitHub Desktop
1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. Add the repository: File → Add Local Repository → Select `d:\Nursify`
4. Publish to GitHub

## Quick Commands Reference

```bash
# Check status
git status

# Add specific files
git add filename.js

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# View commit history
git log --oneline
```

## Files Already Configured

✅ `.gitignore` - Excludes node_modules, .env, build files, etc.
✅ `README.md` - Comprehensive project documentation
✅ Project structure is ready

## Important Notes

⚠️ **Security**: The `.gitignore` file is configured to exclude:
- `.env` files (contains sensitive credentials)
- `node_modules/` folders
- Build outputs
- Temporary files

⚠️ **Credentials**: The `ADMIN_CREDENTIALS.md` file is included. If you want to keep admin credentials private, add this line to `.gitignore`:
```
ADMIN_CREDENTIALS.md
```

## After Pushing to GitHub

1. **Add collaborators**: Repository Settings → Collaborators
2. **Set up branch protection**: Settings → Branches → Add rule
3. **Enable GitHub Actions** (optional): For CI/CD
4. **Add topics/tags**: For better discoverability

## Repository Topics to Add

Add these topics to your GitHub repository for better visibility:
- `healthcare`
- `react-native`
- `expo`
- `nodejs`
- `express`
- `mongodb`
- `typescript`
- `healthcare-management`
- `nursing`
- `patient-care`

## Need Help?

- Git Documentation: https://git-scm.com/doc
- GitHub Guides: https://guides.github.com/
- Git Cheat Sheet: https://education.github.com/git-cheat-sheet-education.pdf

---

**Once Git is installed, follow Step 4 to push your code to GitHub!** 🎉
