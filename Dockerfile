
FROM node:16-alpine3.18

ARG buildno=0
ARG commit_sha

WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .

RUN echo $buildno > buildinfo
RUN echo $commit_sha >> buildinfo
RUN echo $(date +%s) >> buildinfo

RUN echo buildno = $buildno
RUN echo sha = $commit_sha
RUN echo build info = 
RUN cat buildinfo

CMD ["node", "src/index.js"]