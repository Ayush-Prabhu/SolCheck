const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname,'..', 'artifacts/build-info'); // Replace with your folder path

async function extractASTs(folderPath) {
    // Read the directory
    const files = fs.readdirSync(folderPath);
    
    // Process each file
    files.forEach(file => {
        const filePath = path.join(folderPath, file);

        // Only process JSON files
        if (path.extname(filePath) === '.json') {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const jsonContent = JSON.parse(fileContent);
            
            // Check if the JSON contains the expected AST path
            if (jsonContent.output && jsonContent.output.sources) {
                for (const source in jsonContent.output.sources) {
                    if (jsonContent.output.sources[source].ast) {
                        const ast = jsonContent.output.sources[source].ast;
                        console.log(`AST for ${source}:`, JSON.stringify(ast, null, 2));
                    }
                }
            } else {
                console.log(`No AST found in ${file}`);
            }
        }
    });
}

extractASTs(folderPath)
    .then(() => console.log('AST extraction completed.'))
    .catch((error) => {
        console.error('Error during AST extraction:', error.message);
    });
