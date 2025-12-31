#!/bin/bash

# Setup script for FusionSolar API Client

echo "Setting up FusionSolar API Client..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "Creating .env file from template..."
  cp .env.example .env
  echo "✓ Created .env file"
  echo "⚠️  Please edit .env and add your FusionSolar credentials"
else
  echo "✓ .env file already exists"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete! 🎉"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your FusionSolar credentials"
echo "2. Run 'npm run dev' to start in development mode"
echo "3. Or run 'npm run build && npm start' for production mode"
