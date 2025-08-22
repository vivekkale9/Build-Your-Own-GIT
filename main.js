#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const GitClient = require("./git/Client");

const {
  CatFileCommand,
  HashObjectCommand,
  AddCommand,
  LSTreeCommand,
  CommitCommand,
  PushCommand,
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
  case "ls-tree":
    handleLsTreeCommand();
    break;
  case "commit":
    handleCommitCommand();
    break;
  case "push":
    handlePushCommand();
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

function handleLsTreeCommand() {
  let flag = process.argv[3];
  let sha = process.argv[4];

  if(!sha && flag=='--name-only'){
    return;
  }
  if(!sha) {
    sha = flag;
    flag = null;
  }

  const command = new LSTreeCommand(flag, sha);
  gitClient.run(command);
} 

function handleCommitCommand() {
  let message = null;
  let amend = false;
  let allowEmpty = false;
  
  // Parse arguments
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === "-m" || arg === "--message") {
      if (i + 1 < process.argv.length) {
        message = process.argv[i + 1];
        i++;
      } else {
        throw new Error("No message provided with -m/--message flag");
      }
    } else if (arg === "--amend") {
      amend = true;
    } else if (arg === "--allow-empty") {
      allowEmpty = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  
  if (!message && !amend) {
    throw new Error("No commit message provided. Use -m flag.");
  }
  
  // If amending, get the previous commit message if none provided
  if (amend && !message) {
    try {
      const headPath = path.join(process.cwd(), ".git", "HEAD");
      const headContent = fs.readFileSync(headPath, "utf8").trim();
      let commitHash;
      
      if (headContent.startsWith("ref: ")) {
        const ref = headContent.substring(5);
        const refPath = path.join(process.cwd(), ".git", ref);
        
        if (fs.existsSync(refPath)) {
          commitHash = fs.readFileSync(refPath, "utf8").trim();
        }
      } else {
        commitHash = headContent;
      }
      
      if (commitHash) {
        const commitObj = gitClient.run(new CatFileCommand("commit", commitHash));
        const lines = commitObj.toString().split("\n");
        
        // Find the message (after the blank line)
        let messageFound = false;
        let previousMessage = [];
        
        for (const line of lines) {
          if (!messageFound && line.trim() === "") {
            messageFound = true;
          } else if (messageFound) {
            previousMessage.push(line);
          }
        }
        
        message = previousMessage.join("\n");
      }
    } catch (err) {
      throw new Error("Could not read previous commit message for amend");
    }
  }
  
  const options = { amend, allowEmpty };
  const command = new CommitCommand(message, options);
  gitClient.run(command);
}

function handlePushCommand() {
  const remoteName = process.argv[3] || "origin";
  const refspec = process.argv[4] || "";
  
  const command = new PushCommand(remoteName, refspec);
  gitClient.run(command);
}