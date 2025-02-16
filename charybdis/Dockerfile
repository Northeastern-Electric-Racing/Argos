# Use official Node.js image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json, yarn.lock, package-lock.json, and .env first
COPY package.json yarn.lock package-lock.json .env ./

# Install dependencies using both npm and yarn
RUN npm install && yarn install

# Copy the rest of the application files
COPY . .

# Expose necessary ports (optional)
EXPOSE 3000

# No default command; user enters manually
ENTRYPOINT ["/bin/sh"]
