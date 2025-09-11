#!/bin/bash

# Redeployment script for Estrella Custom Backend
# This script pulls latest changes, installs dependencies, and restarts the server

echo "Starting redeployment process..."

# Pull latest changes from main branch
echo "Pulling latest changes from origin/main..."
git pull origin main

# Check if git pull was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to pull changes from git"
    exit 1
fi

# Install/update dependencies
echo "Installing/updating dependencies..."
npm install

# Check if npm install was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

# Restart PM2 server
echo "Restarting PM2 server..."
pm2 restart server

# Check if PM2 restart was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to restart PM2 server"
    exit 1
fi

echo "Redeployment completed successfully!"