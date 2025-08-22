const fs = require("fs");
const path = require("path");
const IndexOperations = require("../utils/indexOperations");
const hasConflicts = require("../utils/checkConflicts");
const getParentCommits = require("../utils/getParentCommits");
const {
  createTreeFromIndex,
  getTreeFromCommit,
} = require("../utils/treeOperations");
const { createCommitObject } = require("../utils/objectOperations");
const { updateRef, getCurrentBranch } = require("../utils/helper");

class CommitCommand {
  constructor(message, options = {}) {
    this.message = message;
    this.amend = options.amend || false;
    this.allowEmpty = options.allowEmpty || false;
    this.indexOps = new IndexOperations();
  }

  execute() {
    if (hasConflicts()) {
      console.error("You have unmerged paths. Resolve conflicts first.");
      return;
    }

    const indexPath = path.join(process.cwd(), ".git", "index");
    if (!fs.existsSync(indexPath)) {
      if (!this.allowEmpty) {
        console.error("Nothing to commit, no changes added to index");
        return;
      }
    }

    const entries = this.indexOps.readIndex(indexPath);
    if (entries.length === 0 && !this.allowEmpty) {
      console.error("Nothing to commit, index is empty");
      return;
    }

    const parentCommits = getParentCommits(this.amend);

    const treeHash = createTreeFromIndex(entries);

    if (parentCommits.length === 1 && !this.allowEmpty) {
      const parentTree = getTreeFromCommit(parentCommits[0]);
      if (parentTree === treeHash) {
        console.log(
          "No changes to commit (use --allow-empty to allow empty commits)"
        );
        return;
      }
    }

    const commitHash = createCommitObject(
      treeHash,
      parentCommits,
      this.message
    );

    updateRef(commitHash, this.message);

    const branchName = getCurrentBranch();
    const shortHash = commitHash.slice(0, 7);

    if (parentCommits.length === 0) {
      console.log(
        `[${branchName} (root-commit) ${shortHash}] ${
          this.message.split("\n")[0]
        }`
      );
    } else if (this.amend) {
      console.log(
        `[${branchName} ${shortHash}] ${this.message.split("\n")[0]} (amended)`
      );
    } else {
      console.log(
        `[${branchName} ${shortHash}] ${this.message.split("\n")[0]}`
      );
    }
  }
}

module.exports = CommitCommand;
