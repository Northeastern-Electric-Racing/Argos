# build the node application, required for serving step
FROM node:alpine AS Build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Use official nginx image as the base image
FROM nginx:latest as Production

# Set the working directory
WORKDIR /usr/local/app

# copy dist
COPY --from=Build /usr/src/app/dist /usr/local/app/

# Copy the build output to replace the default nginx contents.
RUN mv /usr/local/app/angular-client/* /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]