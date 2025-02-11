const fs = require('fs');
const path = require('path');

// Function to extract nodes from the AST
function extractNodes(node, parentName = null, depth = 0) {
  const nodeName = node.nodeType || "Unknown";
  const children = [];

  // If the node has children, extract them
  if (node.nodes) {
    for (const child of node.nodes) {
      children.push(extractNodes(child, nodeName, depth + 1));
    }
  }

  return {
    node: nodeName,
    children: children,
    parent: parentName,
    depth: depth
  };
}

// Function to convert the tree structure into a matrix
function treeToMatrix(tree) {
  const matrix = [];
  const nodeTypes = new Set();

  // First, collect all unique node types
  function collectNodeTypes(node) {
    nodeTypes.add(node.node);
    node.children.forEach(collectNodeTypes);
  }

  tree.forEach(collectNodeTypes);

  // Create a mapping for one-hot encoding
  const nodeTypeArray = Array.from(nodeTypes);
  const nodeTypeIndex = Object.fromEntries(nodeTypeArray.map((type, index) => [type, index]));

  // Convert each node into a fixed-size feature vector
  function convertNodeToVector(node) {
    const vector = new Array(nodeTypeArray.length + 2).fill(0); // +2 for parent and depth
    vector[nodeTypeIndex[node.node]] = 1; // One-hot encoding for node type
    if (node.parent) {
      vector[nodeTypeIndex[node.parent] + 1] = 1; // One-hot encoding for parent type
    }
    vector[vector.length - 1] = node.depth; // Depth
    return vector;
  }

  // Flatten the tree and convert to matrix
  tree.forEach(node => {
    const nodeVector = convertNodeToVector(node);
    matrix.push(nodeVector);
    node.children.forEach(child => {
      const childVector = convertNodeToVector(child);
      matrix.push(childVector);
    });
  });

  return matrix;
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

            // Convert the tree structure into a matrix
            const matrix = treeToMatrix(extractedData);

            // Define output file path
            const outputFilePath = fullPath.replace('.json', '-matrix.json');

            // Write the matrix to a file
            fs.writeFile(outputFilePath, JSON.stringify(matrix, null, 2), (err) => {
              if (err) {
                console.error('Error writing the matrix to file:', err);
              } else {
                console.log(`Matrix written to ${outputFilePath}`);
              }
            });
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
