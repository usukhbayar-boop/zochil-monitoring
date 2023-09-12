echo 'Building API docs..'

yarn build-docs
scp redoc-static.html root@prod:/var/www/developer/index.html
rm redoc-static.html
