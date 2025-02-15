// batch_compile.js
const hre = require("hardhat");
const fs = require("fs-extra");
const path = require("path");

// Constants
const CONTRACTS_DIR = path.join(__dirname, "../contracts");
const BATCH_SIZE = 250;
const DISABLED_DIR = path.join(__dirname, "../disabled_contracts");

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Read and parse pragma version from contract
async function detectSolidityVersion(contractPath) {
    try {
        const content = await fs.readFile(contractPath, 'utf8');
        const pragmaMatch = content.match(/pragma solidity\s*([^;]+);/);
        
        if (!pragmaMatch) {
            return null;
        }

        let versionString = pragmaMatch[1].trim();
        
        // Handle different version patterns
        versionString = versionString
            .replace(/\^/g, '')  // Remove carets
            .replace(/>=?/g, '')  // Remove >= or >
            .replace(/<=?/g, '')  // Remove <= or <
            .replace(/~|\s/g, '') // Remove tildes and spaces
            .split(' ')[0];  // Take first version if multiple

        // Match exact version or start of version
        const versionMatch = versionString.match(/(\d+\.\d+\.\d+)|(\d+\.\d+)/);
        
        if (!versionMatch) {
            return null;
        }

        const version = versionMatch[0];
        // Ensure patch version
        const fullVersion = version.split('.').length === 2 ? `${version}.0` : version;

        return fullVersion;
    } catch (error) {
        console.error(`Error in ${path.basename(contractPath)}: ${error.message}`);
        return null;
    }
}

// Process a single batch of contracts
async function processBatch(contracts) {
    if (!contracts || contracts.length === 0) {
        return;
    }

    // Ensure disabled directory exists
    await fs.ensureDir(DISABLED_DIR);

    // Get all current contract files
    const allFiles = await fs.readdir(CONTRACTS_DIR);
    const solFiles = allFiles.filter(f => f.endsWith('.sol'));

    // Determine which files to temporarily disable
    const filesToDisable = solFiles.filter(f => !contracts.includes(f));

    // Move files to disable
    const movePromises = filesToDisable.map(file => 
        fs.move(
            path.join(CONTRACTS_DIR, file),
            path.join(DISABLED_DIR, file),
            { overwrite: true }
        )
    );

    try {
        await Promise.all(movePromises);
        
        // Compile batch
        await hre.run('compile', { 
            force: true,
            quiet: true
        });

    } catch (error) {
        console.error('Compilation error:', error.message);
    } finally {
        // Restore disabled files
        const restorePromises = filesToDisable.map(file =>
            fs.move(
                path.join(DISABLED_DIR, file),
                path.join(CONTRACTS_DIR, file),
                { overwrite: true }
            )
        );
        await Promise.all(restorePromises);
    }
}

// Main execution function
async function main() {
    try {
        // Initialize
        console.log('Starting batch compilation process...');
        const startTime = Date.now();

        // Ensure contracts directory exists
        await fs.ensureDir(CONTRACTS_DIR);

        // Get all .sol files
        const files = await fs.readdir(CONTRACTS_DIR);
        const solFiles = files.filter(f => f.endsWith('.sol'));

        console.log(`📄 Found ${solFiles.length} contracts`);

        // Group contracts by version
        const versionGroups = new Map();
        
        for (const file of solFiles) {
            const version = await detectSolidityVersion(path.join(CONTRACTS_DIR, file));
            
            if (!version) {
                console.error(`❌ Missing compiler for ${file}: unknown version`);
                continue;
            }

            if (!versionGroups.has(version)) {
                versionGroups.set(version, []);
            }
            versionGroups.get(version).push(file);
        }

        // Process each version group
        let batchNumber = 1;
        for (const [version, files] of versionGroups) {
            console.log(`\nProcessing contracts with Solidity ${version}`);
            
            // Process files in batches
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const batch = files.slice(i, i + BATCH_SIZE);
                console.log(`\n⚡ Processing batch ${batchNumber} (${batch.length} files)`);
                
                await processBatch(batch);
                
                console.log(`✅ Completed batch ${batchNumber}`);
                batchNumber++;

                // Small delay between batches to prevent system overload
                await sleep(1000);
            }
        }

        // Cleanup
        await fs.remove(DISABLED_DIR);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n🎉 Compilation completed in ${duration.toFixed(1)} seconds`);

    } catch (error) {
        console.error('\n🚨 Critical error:', error);
        process.exit(1);
    }
}

// Execute main function
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });