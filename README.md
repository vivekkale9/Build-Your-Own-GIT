# Git

A JavaScript implementation of Git's core functionality. This project is built from scratch to understand Git's internal workings and provides a simplified version of Git commands.

## Overview

Git implements several fundamental Git commands using Node.js, giving insights into how Git manages version control under the hood. This project is educational and demonstrates Git's core concepts like object storage, references, and pushing changes.

## Features

- **init**: Initialize a new Git repository
- **cat-file**: Display contents of Git objects
- **hash-object**: Calculate object ID and optionally create a blob from a file
- **add**: Add file contents to the index
- **ls-tree**: List the contents of a tree object
- **commit**: Record changes to the repository
- **push**: Update remote references along with associated objects

## Installation

```bash
# Clone the repository
git clone [https://github.com/vivekkale9/Build-Your-Own-GIT]

# Install dependencies (if any)
npm install
```

## Usage

```bash
# Initialize a new Git repository
node main.js init

# Add a file to the index
node main.js add file.txt

# Create a commit
node main.js commit -m "Your commit message"

# Push to a local repository
node main.js push origin main
```

## Project Structure

```
Git/
├── main.js            # Main entry point with command handlers
├── git/               # Core Git implementation
│   ├── Client.js      # Client for executing Git commands
│   ├── commands/      # Implementation of Git commands
│   │   ├── add-file.js
│   │   ├── cat-file.js
│   │   ├── commit.js
│   │   ├── hash-object.js
│   │   ├── index.js   # Exports for all commands
│   │   ├── ls-tree.js
│   │   └── push.js
│   └── utils/         # Utility functions
```

## How It Works

Git implements Git's content-addressable filesystem, where objects are stored based on the SHA-1 hash of their contents. The project includes:

1. **Object Storage**: Blobs, trees, and commits are compressed and stored in the `.git/objects` directory
2. **Reference Management**: Branch and HEAD references are managed in the `.git/refs` directory
3. **Index Management**: Files are staged in the Git index before committing
4. **Local Protocol Implementation**: Pushing changes to local repositories

## Limitations

- Only supports local repositories through the `file://` protocol
- HTTP/HTTPS and SSH protocols are not implemented
- Limited error handling compared to the real Git
- Simplified implementations of complex Git features

## Acknowledgments

- This project was inspired by the desire to understand Git's internal architecture
