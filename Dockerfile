FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY index.html manifest.json sw.js ./
COPY css/ ./css/
COPY js/ ./js/
COPY icons/ ./icons/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
