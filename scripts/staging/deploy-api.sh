echo "Deploying $1 service.."

helm upgrade -f .env.yaml --set SERVICE_NAME=$1 $1-v3 ./scripts/staging/helm
