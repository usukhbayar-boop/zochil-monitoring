echo 'Deploying to DEV server...'

yarn build > /dev/null 2>&1
tar -pczf archive.tar.gz dist resources
scp archive.tar.gz zochil@dev:~/deploy/$1-api/archive.tar.gz
scp package.json zochil@dev:~/deploy/$1-api/package.json

rm archive.tar.gz
rm -r dist
