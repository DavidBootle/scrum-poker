# davidbootle/scrumpokerbackend

# use base typescript node image
FROM node:lts

# Create the app directory and use it as the working directory
WORKDIR /usr/src/app

# Install app dependencies
# copy package.json and package-lock.json
# and run a clean install
COPY package*.json ./
RUN npm ci

# expose app port 3000
EXPOSE 3000

# copy app source code into container
COPY . .

# start server
CMD ["npm", "run", "dev"]