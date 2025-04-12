const readObject = require("./objectOperations");
const crypto = require("crypto");
const zlib = require("zlib");
const path = require("path");
const fs = require("fs");

function createTreeFromIndex(entries) {
  const directories = {};

  entries.forEach((entry) => {
    const parts = entry.path.split("/");
    const fileName = parts.pop();
    const dirPath = parts.join("/");

    if (!directories[dirPath]) {
      directories[dirPath] = [];
    }

    const stage = (entry.flags >> 12) & 3;
    if (stage === 0) {
      directories[dirPath].push({
        name: fileName,
        mode: entry.mode.toString(8).padStart(6, "0"),
        hash: entry.hash.toString("hex"),
      });
    }
  });

  const dirPaths = Object.keys(directories).sort((a, b) => b.length - a.length);
  const treeHashes = {};

  for (const dirPath of dirPaths) {
    const entries = directories[dirPath];
    const treeEntries = [];

    for (const entry of entries) {
      treeEntries.push({
        mode: entry.mode,
        name: entry.name,
        hash: entry.hash,
      });
    }

    for (const subdir in treeHashes) {
      if (subdir === "") continue;

      if (
        subdir.startsWith(dirPath ? dirPath + "/" : "") &&
        subdir.substring(dirPath ? dirPath.length + 1 : 0).indexOf("/") === -1
      ) {
        const subdirName = subdir.substring(dirPath ? dirPath.length + 1 : 0);
        treeEntries.push({
          mode: "040000",
          name: subdirName,
          hash: treeHashes[subdir],
        });
      }
    }

    treeEntries.sort((a, b) => a.name.localeCompare(b.name));

    let treeContent = Buffer.alloc(0);

    for (const entry of treeEntries) {
      const entryBuffer = Buffer.concat([
        Buffer.from(`${entry.mode} ${entry.name}\0`),
        Buffer.from(entry.hash, "hex"),
      ]);
      treeContent = Buffer.concat([treeContent, entryBuffer]);
    }
    const treeHeader = `tree ${treeContent.length}\0`;
    const treeObject = Buffer.concat([Buffer.from(treeHeader), treeContent]);

    const treeHash = crypto.createHash("sha1").update(treeObject).digest("hex");
    const objPath = path.join(
      process.cwd(),
      ".git",
      "objects",
      treeHash.slice(0, 2)
    );
    if (!fs.existsSync(objPath)) {
      fs.mkdirSync(objPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(objPath, treeHash.slice(2)),
      zlib.deflateSync(treeObject)
    );
    treeHashes[dirPath] = treeHash;
  }
  return treeHashes[""] || Object.values(treeHashes)[0];
}

function getTreeFromCommit(commitHash) {
  const commitData = readObject(commitHash, "commit").toString();
  const lines = commitData.split("\n");

  for(const line of lines) {
    if(line.startsWith("tree ")) {
      return line.substring(5);
    }
  }
  throw new Error("No tree found in commit");
}

module.exports = { createTreeFromIndex, getTreeFromCommit };