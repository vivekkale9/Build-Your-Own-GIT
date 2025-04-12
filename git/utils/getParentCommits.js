const fs = require("fs");
const path = require("path");
const readObject = require("./objectOperations");

function getParentCommits(amend=false) {
    const parentCommits = [];
    const headPath = path.join(process.cwd(), ".git", "HEAD");

    if(!fs.existsSync(headPath)) {
        return parentCommits;
    }
    const headContent = fs.readFileSync(headPath, "utf8").trim();
    let currentCommit = null;

    if(headContent.startsWith("ref: ")) {
        const ref = headContent.substring(5);
        const refPath = path.join(process.cwd(), ".git", ref);

        if(fs.existsSync(refPath)) {
            currentCommit = fs.readFileSync(refPath, "utf8").trim();
        }
    } else {
        currentCommit = headContent;
    }

    if(amend && currentCommit) {
        try {
            const commitObj = readObject(currentCommit, "commit");
            const lines = commitObj.toString().split("\n");

            for(const line of lines) {
                if (line.startsWith("parent ")) {
                    parentCommits.push(line.substring(7));
                }
            }
        } catch (err) {
            parentCommits.push(currentCommit);
        }
    }
    return parentCommits;
}

module.exports = getParentCommits;