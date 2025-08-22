const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

class LSTreeCommand {
    constructor(flag, sha) {
        this.flag = flag;
        this.sha = sha;
    }

    execute() {
        const flag = this.flag;
        const sha = this.sha;

        const folder = sha.slice(0, 2);
        const file = sha.slice(2);
        
        const folderPath = path.join(process.cwd(), ".git", "objects", folder);
        const filePath = path.join(folderPath, file);

        if(!fs.existsSync(folderPath)) {
            throw new Error(`Not a valid object name ${sha}`);
        }
        if(!fs.existsSync(filePath)) {
            throw new Error(`Not a valid object name ${sha}`);
        }

        const fileContent = fs.readFileSync(filePath);

        const outputBuffer = zlib.inflateSync(fileContent);
        const output = outputBuffer.toString().split("\0");
        const treeContent = output.slice(1).filter(e => e.includes(" "));
        const names = treeContent.map(e => e.split(" ")[1]);
        names.forEach((name) => process.stdout.write(`${name}\n`));
    }
        
}

module.exports = LSTreeCommand;