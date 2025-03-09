const hre = require("hardhat");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");

const CONTRACTS_DIR = path.join(__dirname, "../contracts");
const BATCH_SIZE = 1000; // Adjust based on your system's memory capacity
const TEMP_DIR = path.join(__dirname, "temp_contracts");

async function main() {
    console.log("Starting batch compilation with memory optimization...");
    const startTime = Date.now();

    // Ensure temp directory exists
    await fs.ensureDir(TEMP_DIR);

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

    // Split into batches
    for (let i = 0; i < solFiles.length; i += BATCH_SIZE) {
        const batch = solFiles.slice(i, i + BATCH_SIZE);
        console.log(`\nProcessing batch ${i / BATCH_SIZE + 1}...`);

        // Prepare temp directory
        await fs.emptyDir(TEMP_DIR);
        
        // Copy batch files to temp directory
        await Promise.all(
            batch.map(async (file) => {
                const src = path.join(CONTRACTS_DIR, file);
                const dest = path.join(TEMP_DIR, file);
                await fs.copy(src, dest);
            })
        );

        // Run compilation with increased memory limit
        try {
            console.log("Compiling batch...");
            await new Promise((resolve, reject) => {
                exec(
                    `node --max-old-space-size=4096 node_modules/.bin/hardhat compile --force`,
                    { 
                        cwd: process.cwd(),
                        env: { 
                            ...process.env,
                            HH_CONTRACTS_DIR: TEMP_DIR // Override contracts directory
                        }
                    },
                    (error, stdout, stderr) => {
                        if (error) {
                            console.error("Batch compilation failed:", stderr);
                            reject(error);
                        } else {
                            console.log(stdout);
                            resolve();
                        }
                    }
                );
            });
        } catch (error) {
            console.error("Error compiling batch:", error.message);
        }

        // Clean up temp files
        await fs.emptyDir(TEMP_DIR);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\nAll batches completed in ${duration.toFixed(1)} seconds`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal error:", error.message);
        process.exit(1);
    });