const CatFileCommand = require("./cat-file");
const HashObjectCommand = require("./hash-object");
const AddCommand = require("./add-file");
const CommitCommand = require("./commit");
const LSTreeCommand = require("./ls-tree");
const PushCommand = require("./push");
module.exports = {
  CatFileCommand,
  HashObjectCommand,
  AddCommand,
  LSTreeCommand,
  CommitCommand,
  PushCommand,
};
