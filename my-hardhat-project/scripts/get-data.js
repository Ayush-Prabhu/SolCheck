const axios = require('axios');

const owner = 'smartbugs'; // Replace with the repository owner
const repo = 'smartbugs-wild'; // Replace with the repository name
const path = 'contracts'; // Replace with the path to the folder in the repository
const branch = 'master'; // Replace with the branch name, e.g., 'main' or 'master'

async function getRepoContents(owner, repo, path, branch) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await axios.get(url);
    return response.data;
}

async function readFilesInFolder(owner, repo, path, branch) {
    try {
        const contents = await getRepoContents(owner, repo, path, branch);
        for (const item of contents) {
            if (item.type === 'file') {
                const fileContent = await axios.get(item.download_url);
                console.log(`Contents of ${item.name}:`);
                console.log(fileContent.data);
            }
        }
    } catch (error) {
        console.error(`Error reading files in folder: ${error.message}`);
    }
}

readFilesInFolder(owner, repo, path, branch);
