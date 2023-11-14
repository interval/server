FROM node:18-alpine
RUN npm i --save-prod -g @interval/server
EXPOSE 3000
CMD [ "interval-server", "start"]