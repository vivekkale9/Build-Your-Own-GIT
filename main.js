const fs = require("fs");
const path = require("path");
const GitClient = require("./git/Client");

const {
  CatFileCommand,
  HashObjectCommand,
  AddCommand,
} = require("./git/commands");

const gitClient = new GitClient();

const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    handleCatFileCommand();
    break;
  case "hash-object":
    handleHashObjectCommand();
    break;
  case "add":
    handleAddCommand();
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(
    path.join(process.cwd(), ".git", "HEAD"),
    "ref: refs/heads/main\n"
  );
  console.log("Initialized git directory");
}

function handleCatFileCommand() {
  const flag = process.argv[3];
  const commitSHA = process.argv[4];

  const command = new CatFileCommand(flag, commitSHA);
  gitClient.run(command);
}

function handleHashObjectCommand() {
  let flag = process.argv[3];
  let filePath = process.argv[4];

  if (!filePath) {
    filePath = flag;
    flag = null;
  }

  const command = new HashObjectCommand(flag, filePath);
  gitClient.run(command);
}

function handleAddCommand() {
  const filePaths = process.argv.slice(3);

  if (filePaths.length === 0) {
    throw new Error("Nothing specified, nothing added.");
  }

  const command = new AddCommand(filePaths);
  gitClient.run(command);
}
