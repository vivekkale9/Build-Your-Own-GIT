const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const crypto = require("crypto");
const { getTimezoneOffset, getConfigValue } = require("./helper");
function readObject(hash, expectedType=null) {
    const objFolder = hash.slice(0,2);
    const objFile = hash.slice(2);
    const objPath = path.join(process.cwd(), ".git", "objects", objFolder, objFile);

    if(!fs.existsSync(objPath)) {
        throw new Error(`Object ${hash} not found`);
    }

    const compressed = fs.readFileSync(objPath);
    const raw = zlib.inflateSync(compressed);

    const nullPos = raw.indexOf(0);
    const header = raw.slice(0, nullPos).toString();
    const [type, size] = header.split(" ");

    if(expectedType && type!= expectedType) {
        throw new Error(`Expected ${expectedType}, got ${type}`);
    }

    return raw.slice(nullPos + 1);    
}

function createCommitObject(treeHash, parentCommits, message) {
    const authorName = getConfigValue("user.name") || "Unknown";
    const authorEmail = getConfigValue("user.email") || "unknown@example.com";
    const commiterName = authorName;;
    const commiterEmail = authorEmail;

    const timestamp = Math.floor(Date.now() / 1000);
    const timezone = getTimezoneOffset();

    let commitContent = `tree ${treeHash}\n`;

    for(const parent of parentCommits) {
        commitContent += `parent ${parent}\n`;
    }

    commitContent += `author ${authorName} <${authorEmail}> ${timestamp} ${timezone}\n`;
    commitContent += `committer ${commiterName} <${commiterEmail}> ${timestamp} ${timezone}\n\n`;

    commitContent += `${message}\n`;

    const header = `commit ${Buffer.from(commitContent).length}\0`;
    const commitObject = Buffer.concat([
      Buffer.from(header),
      Buffer.from(commitContent)
    ]);
    
    const commitHash = crypto.createHash("sha1").update(commitObject).digest("hex");
    const objPath = path.join(process.cwd(), ".git", "objects", commitHash.slice(0, 2));
    
    if (!fs.existsSync(objPath)) {
      fs.mkdirSync(objPath, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(objPath, commitHash.slice(2)),
      zlib.deflateSync(commitObject)
    );
    
    return commitHash;
}

module.exports = { readObject, createCommitObject };