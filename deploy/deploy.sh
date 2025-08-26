#!/bin/bash

echo "Starting Angular deployment..."

echo "Minifying group JSON files..."

# Run the node minify-json script
node minify-json.js
if [ $? -ne 0 ]; then
    echo "❌ JSON minification failed with exit code $?."
    exit $?
fi

echo "✅ JSON minification completed."

# Run Angular deploy with base href
ng deploy --base-href=/infinity-fun/
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed with exit code $?."
    exit $?
fi

echo "✅ Deployment completed successfully."
