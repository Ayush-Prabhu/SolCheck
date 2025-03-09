// batch_compile.js
const hre = require("hardhat");
const fs = require("fs-extra");
const path = require("path");

// Constants
const CONTRACTS_DIR = path.join(__dirname, "../contracts"); // Adjust if necessary
const BATCH_SIZE = 1; // Number of contracts per batch

// Helper function to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Read and parse pragma version from contract
async function detectSolidityVersion(contractPath) {
    try {
        const content = await fs.readFile(contractPath, "utf8");
        const pragmaMatch = content.match(/pragma solidity\s*([^;]+);/);
        if (!pragmaMatch) return null;

        let versionString = pragmaMatch[1].trim();
        versionString = versionString.replace(/\^/g, "").replace(/>=?/g, "").replace(/<=?/g, "").replace(/~|\s/g, "").split(" ")[0];
        const versionMatch = versionString.match(/(\d+\.\d+\.\d+)|(\d+\.\d+)/);
        return versionMatch ? versionMatch[0] : null;
    } catch (error) {
        console.error(`Error reading ${contractPath}: ${error.message}`);
        return null; // Return null if there's an error reading the file
    }
}

// Process a single contract
async function processContract(contract) {
    try {
        console.log(`Compiling contract: ${contract}`);
        await hre.run("compile", { force: true, quiet: true });
        console.log(`Successfully compiled contract: ${contract}`);
    } catch (error) {
        console.error(`Compilation error for ${contract}:`, error.message);
        return contract; // Return the contract name if compilation fails
    }
}

// Main execution function
async function main() {
    console.log("Starting batch compilation process...");
    const startTime = Date.now();

    // Get all .sol files
    let files;
    try {
        files = await fs.readdir(CONTRACTS_DIR);
    } catch (error) {
        console.error(`Error reading directory ${CONTRACTS_DIR}:`, error.message);
        process.exit(1);
    }

    const solFiles = files.filter(f => f.endsWith(".sol"));

    console.log(`Found ${solFiles.length} contracts`);

    // Group contracts by version
    const versionGroups = new Map();
    
    for (const file of solFiles) {
        const version = await detectSolidityVersion(path.join(CONTRACTS_DIR, file));
        
        // If version is not found, still add it to a default group
        const groupKey = version || 'default';

        if (!versionGroups.has(groupKey)) {
            versionGroups.set(groupKey, []);
        }
        versionGroups.get(groupKey).push(file);
    }

    // Array to hold skipped contracts
    const skippedContracts = [];

    // Process each version group
    for (const [version, files] of versionGroups) {
        console.log(`\nProcessing contracts with Solidity ${version}`);

        // Process files in batches
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch (${batch.length} files):`, batch);

            // Use Promise.all to compile all contracts in the current batch in parallel
            const results = await Promise.all(batch.map(contract => processContract(contract)));

            // Collect any skipped contracts (those that failed to compile)
            results.forEach(result => {
                if (result) skippedContracts.push(result);
            });

            // Small delay between batches to prevent system overload
            await sleep(100); // Adjust as needed to avoid too much concurrency
        }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Compilation completed in ${duration.toFixed(1)} seconds`);

    // Display skipped contracts at the end of execution
    if (skippedContracts.length > 0) {
        console.log("\nSkipped contracts due to compilation errors:");
        skippedContracts.forEach(contract => console.log(contract));
    } else {
        console.log("\nAll contracts compiled successfully.");
    }
}

// Execute main function
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal error:", error.message);
        process.exit(1);
    });
