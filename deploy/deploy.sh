#!/bin/bash

echo "Starting Angular deployment..."

ng deploy --base-href=/infinity-fun/
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed with exit code $?."
    exit $?
fi

echo "✅ Deployment completed successfully."
