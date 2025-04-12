const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const readIndexFile = require("../utils/indexOperations");
const IndexOperations = require("../utils/indexOperations");

class AddCommand {
  constructor(filePaths) {
    this.filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
    this.indexOps = new IndexOperations();
  }

  execute() {
    const indexPath = path.join(process.cwd(), ".git", "index");
    let entries = [];

    if (fs.existsSync(indexPath)) {
      entries = this.indexOps.readIndex(indexPath);
    }

    for (const filePath of this.filePaths) {
      try {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
          console.error(`pathspec '${filePath}' did not match any files`);
          continue;
        }

        const stats = fs.statSync(resolvedPath);
        if (stats.isDirectory()) {
          console.error(`'${filePath}' is a directory - add files instead`);
          continue;
        }

        const fileContent = fs.readFileSync(resolvedPath);
        const fileLength = fileContent.length;

        const header = `blob ${fileLength}\0`;
        const blob = Buffer.concat([Buffer.from(header), fileContent]);

        const hash = crypto.createHash("sha1").update(blob).digest("hex");

        const folder = hash.slice(0, 2);
        const file = hash.slice(2);
        const objPath = path.join(process.cwd(), ".git", "objects", folder);

        if (!fs.existsSync(objPath)) {
          fs.mkdirSync(objPath, { recursive: true });
        }

        fs.writeFileSync(path.join(objPath, file), zlib.deflateSync(blob));
        const relativePath = path
          .relative(process.cwd(), resolvedPath)
          .replace(/\\/g, "/");
        const entry = {
          ctime: stats.ctime,
          mtime: stats.mtime,
          dev: stats.dev,
          ino: stats.ino,
          mode: stats.mode,
          uid: stats.uid,
          gid: stats.gid,
          size: stats.size,
          hash: Buffer.from(hash, "hex"),
          flags: 0, // Assume no special flags
          path: relativePath,
        };

        const existingIndex = entries.findIndex((e) => e.path === relativePath);
        if (existingIndex !== -1) {
          entries[existingIndex] = entry;
        } else {
          entries.push(entry);
        }
        console.log(`added '${relativePath}' to index`);
      } catch (error) {
        console.error(`Error adding file ${filePath}: ${error.message}`);
      }
    }
    entries.sort((a, b) => a.path.localeCompare(b.path));

    // Write the index
    this.indexOps.writeIndex(indexPath, entries);
  }
}

module.exports = AddCommand;
