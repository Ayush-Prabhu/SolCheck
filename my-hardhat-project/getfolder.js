const axios = require('axios');
const fs = require('fs');
const path = require('path');

const owner = 'smartbugs'; // Replace with the repository owner
const repo = 'smartbugs-wild'; // Replace with the repository name
const path = 'contracts'; // Replace with the path to the folder in the repository
const branch = 'master'; // Replace with the branch name, e.g., 'main' or 'master'

async function getRepoContents(owner, repo, folderPath, branch) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`;
    const response = await axios.get(url);
    return response.data;
}

async function downloadFile(url, filePath) {
    const writer = fs.createWriteStream(filePath);
    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function downloadFolder(owner, repo, folderPath, branch) {
    try {
        const contents = await getRepoContents(owner, repo, folderPath, branch);
        for (const item of contents) {
            if (item.type === 'file') {
                const filePath = path.join(__dirname, folderPath, item.name);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                await downloadFile(item.download_url, filePath);
                console.log(`Downloaded ${item.name}`);
            }
        }
        console.log('Folder download completed.');
    } catch (error) {
        console.error(`Error downloading folder: ${error.message}`);
    }
}

downloadFolder(owner, repo, folderPath, branch);
