const fs = require('fs');
const path = require('path');

async function main() {
    await hre.run('compile');

    const contractPath = path.join(__dirname, '..', 'artifacts/contracts/Lock.sol/Lock.json');
    const contractJSON = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

    const ast = contractJSON.sourceMap[0].ast;
    console.log(JSON.stringify(ast, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
