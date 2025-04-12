const CatFileCommand = require("./cat-file");
const HashObjectCommand = require("./hash-object");
const AddCommand = require("./add-file");
const CommitCommand = require("./commit");
const LSTreeCommand = require("./ls-tree");

module.exports = {
  CatFileCommand,
  HashObjectCommand,
  AddCommand,
  LSTreeCommand,
  CommitCommand,
};
