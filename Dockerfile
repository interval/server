FROM node:18-alpine
RUN npm i --save-prod -g https://s3.us-west-1.wasabisys.com/interval-team-public-files/release3.tar.gz
EXPOSE 3000
CMD [ "interval-server", "start"]