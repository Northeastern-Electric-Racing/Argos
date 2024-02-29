# Use official nginx image as the base image
FROM nginx:latest as Production

# Set the working directory
WORKDIR /usr/local/app

# Add the build file
COPY ./dist /usr/local/app

# Copy the build output to replace the default nginx contents.

RUN mv /usr/local/app/angular-client/* /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]