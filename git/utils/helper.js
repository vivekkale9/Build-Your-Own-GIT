const fs = require("fs");
const path = require("path");
const os = require("os");

function getTimezoneOffset() {
  const date = new Date();
  const offset = -date.getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
  return (offset >= 0 ? "+" : "-") + hours + minutes;
}

function getConfigValue(key) {
  try {
    // Try to read from local .git/config first
    const configPath = path.join(process.cwd(), ".git", "config");

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      const regex = new RegExp(`\\[user\\][\\s\\S]*?${key}\\s*=\\s*(.*)`, "i");
      const match = configContent.match(regex);

      if (match) {
        return match[1].trim();
      }
    }

    // Try global config
    const globalConfigPath = path.join(os.homedir(), ".gitconfig");

    if (fs.existsSync(globalConfigPath)) {
      const configContent = fs.readFileSync(globalConfigPath, "utf8");
      const regex = new RegExp(`\\[user\\][\\s\\S]*?${key}\\s*=\\s*(.*)`, "i");
      const match = configContent.match(regex);

      if (match) {
        return match[1].trim();
      }
    }
  } catch (err) {
    // Silently fail and return null
  }

  return null;
}

function getCurrentBranch() {
  const headPath = path.join(process.cwd(), ".git", "HEAD");
  if (!fs.existsSync(headPath)) {
    return "main"; // Default
  }

  const headContent = fs.readFileSync(headPath, "utf8").trim();

  if (headContent.startsWith("ref: refs/heads/")) {
    return headContent.substring("ref: refs/heads/".length);
  }

  return "HEAD"; // Detached HEAD
}

function updateRef(commitHash, message) {
    const headPath = path.join(process.cwd(), ".git", "HEAD");
    if (!fs.existsSync(headPath)) {
      console.error("HEAD file not found");
      return;
    }
    
    const headContent = fs.readFileSync(headPath, "utf8").trim();
    
    if (headContent.startsWith("ref: ")) {
      const ref = headContent.substring(5);
      const refPath = path.join(process.cwd(), ".git", ref);
      
      // Create directory if it doesn't exist
      const refDir = path.dirname(refPath);
      if (!fs.existsSync(refDir)) {
        fs.mkdirSync(refDir, { recursive: true });
      }
      
      // Update the reference
      fs.writeFileSync(refPath, commitHash + "\n");
      
      // Update reflog
      updateReflog(ref, commitHash, message);
    } else {
      // Detached HEAD state
      fs.writeFileSync(headPath, commitHash + "\n");
    }
}

function updateReflog(ref, newHash, message) {
    const reflogDir = path.join(process.cwd(), ".git", "logs", path.dirname(ref));
    const reflogPath = path.join(process.cwd(), ".git", "logs", ref);
    
    if (!fs.existsSync(reflogDir)) {
      fs.mkdirSync(reflogDir, { recursive: true });
    }
    
    let oldHash = "0000000000000000000000000000000000000000";
    if (fs.existsSync(path.join(process.cwd(), ".git", ref))) {
      try {
        oldHash = fs.readFileSync(path.join(process.cwd(), ".git", ref), "utf8").trim();
      } catch (err) {
        // If reading fails, use zeros
      }
    }
    
    const authorName = getConfigValue("user.name") || "Unknown";
    const authorEmail = getConfigValue("user.email") || "unknown@example.com";
    const timestamp = Math.floor(Date.now() / 1000);
    
    const reflogEntry = `${oldHash} ${newHash} ${authorName} <${authorEmail}> ${timestamp} +0000\tcommit${this.amend ? " (amend)" : ""}: ${message.split("\n")[0]}\n`;
    
    // Append to reflog
    fs.appendFileSync(reflogPath, reflogEntry);
  }

module.exports = { getTimezoneOffset, getConfigValue, getCurrentBranch, updateRef, updateReflog };
