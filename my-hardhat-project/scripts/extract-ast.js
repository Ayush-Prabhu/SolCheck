const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname, '..', 'artifacts/build-info'); // Replace with your folder path
const outputFolderPath = path.join(__dirname, '..', 'AST/source'); // Output folder for AST files

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
                        
                        // Create directory for the source
                        const sourceFolder = path.join(outputFolderPath, source);
                        if (!fs.existsSync(sourceFolder)) {
                            fs.mkdirSync(sourceFolder, { recursive: true });
                        }

                        // Write AST to file
                        const astFilePath = path.join(sourceFolder, 'ast.json');
                        fs.writeFileSync(astFilePath, JSON.stringify(ast, null, 2), 'utf8');
                        console.log(`AST for ${source} written to ${astFilePath}`);
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
