const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const url = require("url");

class PushCommand {
  constructor(remoteName, refspec) {
    this.remoteName = remoteName || "origin";
    this.refspec = refspec || "HEAD:refs/heads/main";
    this.gitDir = path.join(process.cwd(), ".git");
  }

  execute() {
    // Get remote URL
    const remoteUrl = this.getRemoteUrl();
    if (!remoteUrl) {
      console.error(`Remote '${this.remoteName}' not found.`);
      return;
    }

    // Parse the refspec
    const [localRef, remoteRef] = this.parseRefspec();
    
    // Get the local SHA for the ref
    const localSha = this.getRefValue(localRef);
    if (!localSha) {
      console.error(`Local ref '${localRef}' not found.`);
      return;
    }
    
    console.log(`Pushing to ${remoteUrl}`);
    
    // Determine protocol and handle accordingly
    const parsedUrl = url.parse(remoteUrl);
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      console.error("HTTP/HTTPS protocol not implemented.");
    } else if (!parsedUrl.protocol || parsedUrl.protocol === "ssh:") {
      console.error("SSH protocol not implemented.");
    } else if (parsedUrl.protocol === "file:") {
      this.pushLocal(parsedUrl.path, localRef, remoteRef, localSha);
    } else {
      console.error(`Unsupported protocol: ${parsedUrl.protocol}`);
    }
  }

  getRemoteUrl() {
    try {
      const configPath = path.join(this.gitDir, "config");
      if (!fs.existsSync(configPath)) {
        return null;
      }
      
      const config = fs.readFileSync(configPath, "utf8");
      const remoteSection = new RegExp(`\\[remote "${this.remoteName}"\\][\\s\\S]*?url\\s*=\\s*([^\\n]*)`, "i");
      const match = config.match(remoteSection);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      return null;
    } catch (error) {
      console.error(`Error reading remote: ${error.message}`);
      return null;
    }
  }

  parseRefspec() {
    // Handle default refspec for current branch
    if (this.refspec === "") {
      const currentBranch = this.getCurrentBranch();
      return [`refs/heads/${currentBranch}`, `refs/heads/${currentBranch}`];
    }
    
    // Parse the refspec
    const [localRef, remoteRef] = this.refspec.split(":");
    
    // Handle shorthand refs
    let expandedLocalRef = localRef;
    if (localRef === "HEAD") {
      expandedLocalRef = this.resolveHead();
    } else if (!localRef.startsWith("refs/")) {
      expandedLocalRef = `refs/heads/${localRef}`;
    }
    
    // If only local ref is provided, use same name for remote
    let expandedRemoteRef = remoteRef;
    if (!remoteRef) {
      expandedRemoteRef = expandedLocalRef;
    } else if (!remoteRef.startsWith("refs/")) {
      expandedRemoteRef = `refs/heads/${remoteRef}`;
    }
    
    return [expandedLocalRef, expandedRemoteRef];
  }

  getCurrentBranch() {
    try {
      const headPath = path.join(this.gitDir, "HEAD");
      if (!fs.existsSync(headPath)) {
        return "main";
      }
      
      const headContent = fs.readFileSync(headPath, "utf8").trim();
      if (headContent.startsWith("ref: refs/heads/")) {
        return headContent.substring("ref: refs/heads/".length);
      }
      
      return "HEAD"; // Detached HEAD
    } catch (error) {
      console.error(`Error getting current branch: ${error.message}`);
      return "main";
    }
  }

  resolveHead() {
    try {
      const headPath = path.join(this.gitDir, "HEAD");
      if (!fs.existsSync(headPath)) {
        return "refs/heads/main";
      }
      
      const headContent = fs.readFileSync(headPath, "utf8").trim();
      if (headContent.startsWith("ref: ")) {
        return headContent.substring(5);
      }
      
      // Detached HEAD - not handled for simplicity
      console.error("Cannot push with detached HEAD");
      process.exit(1);
    } catch (error) {
      console.error(`Error resolving HEAD: ${error.message}`);
      return "refs/heads/main";
    }
  }

  getRefValue(ref) {
    try {
      if (ref === "HEAD") {
        const headPath = path.join(this.gitDir, "HEAD");
        const headContent = fs.readFileSync(headPath, "utf8").trim();
        
        if (headContent.startsWith("ref: ")) {
          const pointedRef = headContent.substring(5);
          const refPath = path.join(this.gitDir, pointedRef);
          
          if (fs.existsSync(refPath)) {
            return fs.readFileSync(refPath, "utf8").trim();
          }
        } else {
          return headContent; // Detached HEAD - direct commit hash
        }
      } else {
        const refPath = path.join(this.gitDir, ref);
        if (fs.existsSync(refPath)) {
          return fs.readFileSync(refPath, "utf8").trim();
        }
      }
      return null;
    } catch (error) {
      console.error(`Error reading ref ${ref}: ${error.message}`);
      return null;
    }
  }

  pushLocal(remotePath, localRef, remoteRef, localSha) {
    // For local protocol, we can directly copy objects
    const normalizedPath = remotePath.replace(/^\/+/, "");
    const remoteGitDir = path.resolve(normalizedPath);
    
    if (!fs.existsSync(remoteGitDir) || !fs.statSync(remoteGitDir).isDirectory()) {
      console.error(`Remote path '${remoteGitDir}' is not a valid Git repository.`);
      return;
    }
    
    console.log(`Pushing to local repository at ${remoteGitDir}`);
    
    // Check if remote ref exists and get its value
    const remoteRefPath = path.join(remoteGitDir, remoteRef);
    let remoteRefValue = null;
    
    if (fs.existsSync(remoteRefPath)) {
      remoteRefValue = fs.readFileSync(remoteRefPath, "utf8").trim();
    }
    
    // Find and copy all necessary objects
    const objectsToPush = this.findObjectsToPush(localSha, remoteRefValue);
    
    for (const objHash of objectsToPush) {
      const srcObjPath = path.join(
        this.gitDir, 
        "objects", 
        objHash.slice(0, 2), 
        objHash.slice(2)
      );
      
      const destObjDir = path.join(
        remoteGitDir, 
        "objects", 
        objHash.slice(0, 2)
      );
      
      const destObjPath = path.join(destObjDir, objHash.slice(2));
      
      if (!fs.existsSync(destObjDir)) {
        fs.mkdirSync(destObjDir, { recursive: true });
      }
      
      if (!fs.existsSync(destObjPath)) {
        fs.copyFileSync(srcObjPath, destObjPath);
      }
    }
    
    // Update the remote ref
    const refDir = path.dirname(remoteRefPath);
    if (!fs.existsSync(refDir)) {
      fs.mkdirSync(refDir, { recursive: true });
    }
    
    fs.writeFileSync(remoteRefPath, localSha + "\n");
    
    // Update remote's HEAD if pushing to master/main
    if (remoteRef === "refs/heads/master" || remoteRef === "refs/heads/main") {
      const remoteHeadPath = path.join(remoteGitDir, "HEAD");
      if (!fs.existsSync(remoteHeadPath) || 
          !fs.readFileSync(remoteHeadPath, "utf8").includes(remoteRef)) {
        fs.writeFileSync(remoteHeadPath, `ref: ${remoteRef}\n`);
      }
    }
    
    console.log(`${localRef} -> ${remoteRef}`);
  }

  findObjectsToPush(localSha, remoteRefValue) {
    // This is a simplified algorithm
    // Real Git uses a more sophisticated algorithm to find new objects
    const objects = new Set();
    const queue = [localSha];
    const visited = new Set();
    const stopAt = remoteRefValue ? new Set([remoteRefValue]) : new Set();
    
    while (queue.length > 0) {
      const sha = queue.shift();
      
      if (visited.has(sha) || stopAt.has(sha)) {
        continue;
      }
      
      visited.add(sha);
      objects.add(sha);
      
      try {
        const objData = this.readObject(sha);
        const objStr = objData.toString();
        
        // Extract references based on object type
        if (objStr.startsWith("tree ") || objStr.startsWith("parent ") || 
            objStr.includes("\0")) {
          
          // Extract all 40-char SHA-1 hashes
          const matches = objStr.match(/([0-9a-f]{40})/g);
          if (matches) {
            for (const match of matches) {
              if (!visited.has(match) && !stopAt.has(match)) {
                queue.push(match);
              }
            }
          }
          
          // For binary tree objects, need more sophisticated parsing
          // This is a simplified approach
        }
      } catch (error) {
        // Skip objects we can't read
        console.error(`Error processing object ${sha}: ${error.message}`);
      }
    }
    
    return Array.from(objects);
  }

  readObject(hash, expectedType = null) {
    const objFolder = hash.slice(0, 2);
    const objFile = hash.slice(2);
    const objPath = path.join(this.gitDir, "objects", objFolder, objFile);
    
    if (!fs.existsSync(objPath)) {
      throw new Error(`Object ${hash} not found`);
    }
    
    const compressed = fs.readFileSync(objPath);
    const raw = zlib.inflateSync(compressed);
    
    // Parse the object header
    const nullPos = raw.indexOf(0);
    const header = raw.slice(0, nullPos).toString();
    const [type, size] = header.split(" ");
    
    if (expectedType && type !== expectedType) {
      throw new Error(`Expected ${expectedType}, got ${type}`);
    }
    
    return raw.slice(nullPos + 1);
  }
}

module.exports = PushCommand;