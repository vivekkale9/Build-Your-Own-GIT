const fs = require("fs");
const path = require("path");
const IndexOperations = require("../utils/indexOperations");
const indexOps = new IndexOperations();

function hasConflicts() {
    const indexPath = path.join(process.cwd(), ".git", "index");
    if(!fs.existsSync(indexPath)) return false;

    const entries = indexOps.readIndex(indexPath);
    return entries.some(entry => {
        const stage = (entry.flags >> 12) & 3;
        return stage > 0;
    });
}

module.exports = hasConflicts;