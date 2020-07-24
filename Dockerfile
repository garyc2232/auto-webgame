FROM buildkite/puppeteer    

EXPOSE 9222

WORKDIR /app
COPY . /app

RUN npm install
RUN npm install pm2 -g                                                                                           
# RUN npm install -g yarn                                                                          
RUN yarn install