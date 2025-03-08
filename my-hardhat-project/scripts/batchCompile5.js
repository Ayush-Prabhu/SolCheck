const hre = require("hardhat");
const fs = require("fs-extra");
const path = require("path");

const CONTRACTS_DIR = path.join(__dirname, "../contracts");
const BATCH_SIZE = 5; // Adjust based on system capabilities

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function detectSolidityVersion(contractPath) {
    try {
        const content = await fs.readFile(contractPath, "utf8");
        const pragmaMatch = content.match(/pragma solidity\s*([^;]+);/);
        if (!pragmaMatch) return null;

        let versionString = pragmaMatch[1].trim();
        versionString = versionString.replace(/[^0-9.]/g, '').split(' ')[0];
        const versionMatch = versionString.match(/^\d+\.\d+(\.\d+)?/);
        return versionMatch ? versionMatch[0] : null;
    } catch (error) {
        console.error(`Error reading ${contractPath}: ${error.message}`);
        return null;
    }
}

async function compileContracts(versions) {
    const originalConfig = hre.config.solidity;
    try {
        hre.config.solidity = {
            version: versions.length > 0 ? versions[0] : '0.8.0', // Use the first version in the group
            settings: originalConfig.settings
        };
        await hre.run("compile", { force: true, quiet: true });
        return true;
    } catch (error) {
        console.error(`Compilation failed for versions ${versions}: ${error.message}`);
        return false;
    } finally {
        hre.config.solidity = originalConfig;
    }
}

async function main() {
    console.log("Starting batch compilation process...");
    const startTime = Date.now();

    let files;
    try {
        files = await fs.readdir(CONTRACTS_DIR);
    } catch (error) {
        console.error(`Error reading directory ${CONTRACTS_DIR}:`, error.message);
        process.exit(1);
    }

    const solFiles = files.filter(f => f.endsWith(".sol"));

    console.log(`Found ${solFiles.length} contracts`);

    const versionGroups = new Map();
    for (const file of solFiles) {
        const version = await detectSolidityVersion(path.join(CONTRACTS_DIR, file));
        const groupKey = version || 'default';
        if (!versionGroups.has(groupKey)) {
            versionGroups.set(groupKey, []);
        }
        versionGroups.get(groupKey).push(file);
    }

    const skippedContracts = [];

    for (const [version, files] of versionGroups) {
        console.log(`\nProcessing contracts with Solidity ${version}`);
        const success = await compileContracts([version]);
        if (!success) {
            skippedContracts.push(...files);
        }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Compilation completed in ${duration.toFixed(1)} seconds`);

    if (skippedContracts.length > 0) {
        console.log("\nSkipped contracts due to compilation errors:");
        skippedContracts.forEach(contract => console.log(contract));
    } else {
        console.log("\nAll contracts compiled successfully.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal error:", error.message);
        process.exit(1);
    });