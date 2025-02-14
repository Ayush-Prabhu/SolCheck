const fs = require('fs');
const path = require('path');

// Function to extract nodes from the AST
function extractNodes(node, parentName = null) {
  const nodeName = node.nodeType || "Unknown";
  const children = [];

  // If the node has children, extract them
  if (node.nodes) {
    for (const child of node.nodes) {
      children.push(extractNodes(child, nodeName));
    }
  }

  return {
    node: nodeName,
    children: children,
    parent: parentName
  };
}

// Function to read all JSON files in a directory recursively
function readJsonFiles(dir) {
  fs.readdir(dir, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        // Recursively read subdirectories
        readJsonFiles(fullPath);
      } else if (file.isFile() && file.name.endsWith('.json')) {
        // Read JSON files
        fs.readFile(fullPath, 'utf8', (err, data) => {
          if (err) {
            console.error('Error reading the file:', err);
            return;
          }

          try {
            const astData = JSON.parse(data);
            
            // Extract nodes from the root
            const extractedData = astData.nodes.map(node => extractNodes(node));

            // Print the extracted data
            console.log(`Extracted data from ${fullPath}:`);
            console.log(JSON.stringify(extractedData, null, 2));
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
          }
        });
      }
    });
  });
}

// Start reading from the specified directory
const sourceDir = 'AST/source';
readJsonFiles(sourceDir);
