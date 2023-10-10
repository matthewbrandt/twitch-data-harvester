FROM node:16-alpine
WORKDIR /
ARG POSTGRES_PW
COPY package*.json ./
RUN npm install
# RUN npm ci --only=production
COPY . .
# EXPOSE 8080
# CMD [ "node", "chattersToDB.mjs" ]
CMD /usr/sbin/crond -f -l 0 -c / -L /dev/stdout
