# Step 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Step 2: Serve the application using Nginx
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support SPA routing (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
