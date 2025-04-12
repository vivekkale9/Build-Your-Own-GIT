const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

class HashObjectCommand {
    constructor(flag, filePath) {
        this.flag = flag;
        this.filePath = filePath;
    }

    execute(){
        const filePath = path.resolve(this.filePath);

        if(!fs.existsSync(filePath)){
            throw new Error(`could not open '${this.filePath}' for reading: No such file or directory`);
        }

        const fileContent = fs.readFileSync(filePath);
        const fileLength = fileContent.length;
        const header = `blob ${fileLength}\0`;
        const blob = Buffer.concat([Buffer.from(header), fileContent]);

        const hash = crypto.createHash("sha1").update(blob).digest("hex");

        if(this.flag && this.flag === "-w"){
            const folder = hash.slice(0, 2);
            const file = hash.slice(2);

            const completePath = path.join(process.cwd(), ".git", "objects", folder);

            if(!fs.existsSync(completePath)){
                fs.mkdirSync(completePath, { recursive: true });
            }

            fs.writeFileSync(path.join(completePath, file), zlib.deflateSync(blob));
        }
        process.stdout.write(hash);
    }
}

module.exports = HashObjectCommand;