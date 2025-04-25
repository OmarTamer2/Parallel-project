# Use a lightweight Node.js base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of your application
COPY . .

# Start the app
CMD ["node", "signup.js"]
