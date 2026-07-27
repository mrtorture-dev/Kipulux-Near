FROM node:20-alpine

WORKDIR /app

# Copy package metadata
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application files
COPY . .

# Create public/uploads directory and set ownership to unprivileged user
RUN mkdir -p /app/public/uploads && chown -R node:node /app

# Switch to unprivileged node user
USER node

# Expose application port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
