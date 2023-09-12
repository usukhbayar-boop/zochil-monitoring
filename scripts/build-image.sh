echo 'Building image..'

rm -rf dist
npm install
npm run build
docker build -t api-$1 .
docker tag api-$1 registry.digitalocean.com/zochil/api:$1
docker push registry.digitalocean.com/zochil/api:$1
