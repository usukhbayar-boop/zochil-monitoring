echo 'Deploying job-api...'

yarn build
tar -pczf archive.tar.gz dist
scp archive.tar.gz zochil@prod:~/deploy/job-api/archive.tar.gz
scp package.json zochil@prod:~/deploy/job-api/package.json

rm archive.tar.gz
rm -r dist
