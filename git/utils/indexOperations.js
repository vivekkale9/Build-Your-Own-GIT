const fs = require("fs");
const crypto = require("crypto");

class IndexOperations {
  readIndex(indexPath) {
    try {
      const buffer = fs.readFileSync(indexPath);

      const signature = buffer.slice(0, 4).toString();
      if (signature !== "DIRC") {
        console.error("Invalid index file signature");
      }

      const version = buffer.readUInt32BE(4);
      if (version !== 2) {
        console.error(`Unsupported index version: ${version}`);
      }

      const entryCount = buffer.readUInt32BE(8);
      let offset = 12;
      const entries = [];

      for (let i = 0; i < entryCount; i++) {
        const ctime_s = buffer.readUInt32BE(offset);
        offset += 4;
        const ctime_n = buffer.readUInt32BE(offset);
        offset += 4;
        const mtime_s = buffer.readUInt32BE(offset);
        offset += 4;
        const mtime_n = buffer.readUInt32BE(offset);
        offset += 4;
        const dev = buffer.readUInt32BE(offset);
        offset += 4;
        const ino = buffer.readUInt32BE(offset);
        offset += 4;
        const mode = buffer.readUInt32BE(offset);
        offset += 4;
        const uid = buffer.readUInt32BE(offset);
        offset += 4;
        const gid = buffer.readUInt32BE(offset);
        offset += 4;
        const size = buffer.readUInt32BE(offset);
        offset += 4;
        const hash = buffer.slice(offset, offset + 20);
        offset += 20;
        const flags = buffer.readUInt16BE(offset);
        offset += 2;

        let pathEnd = offset;
        while (buffer[pathEnd] !== 0 && pathEnd < buffer.length) {
          pathEnd++;
        }

        const path = buffer.slice(offset, pathEnd).toString();

        offset = pathEnd + 1;
        while (offset % 8 !== 0) {
          offset++;
        }

        entries.push({
          ctime: new Date(ctime_s * 1000 + ctime_n / 1000000),
          mtime: new Date(mtime_s * 1000 + mtime_n / 1000000),
          dev,
          ino,
          mode,
          uid,
          gid,
          size,
          hash,
          flags,
          path,
        });
      }
      return entries;
    } catch (error) {
      console.error(`Error reading index: ${error.message}`);
      return [];
    }
  }

  writeIndex(indexPath, entries) {
    try {
      let totalSize = 12;

      for (const entry of entries) {
        totalSize += 62;
        totalSize += entry.path.length + 1;

        totalSize += (8 - ((62 + entry.path.length + 1) % 8)) % 8;
      }

      totalSize += 20;
      const buffer = Buffer.alloc(totalSize);

      buffer.write("DIRC", 0);
      buffer.writeUInt32BE(2, 4);
      buffer.writeUInt32BE(entries.length, 8);

      let offset = 12;

      for (const entry of entries) {
        const ctime = entry.ctime.getTime();
        const ctime_s = Math.floor(ctime / 1000);
        const ctime_n = (ctime % 1000) * 1000000;

        const mtime = entry.mtime.getTime();
        const mtime_s = Math.floor(mtime / 1000);
        const mtime_n = (mtime % 1000) * 1000000;

        buffer.writeUInt32BE(ctime_s, offset);
        offset += 4;
        buffer.writeUInt32BE(ctime_n, offset);
        offset += 4;
        buffer.writeUInt32BE(mtime_s, offset);
        offset += 4;
        buffer.writeUInt32BE(mtime_n, offset);
        offset += 4;
        buffer.writeUInt32BE(entry.dev, offset);
        offset += 4;
        buffer.writeUInt32BE(entry.ino, offset);
        offset += 4;
        buffer.writeUInt32BE(entry.mode, offset);
        offset += 4;
        buffer.writeUInt32BE(entry.uid, offset);
        offset += 4;
        buffer.writeUInt32BE(entry.gid, offset);
        offset += 4;
        buffer.writeUInt32BE(entry.size, offset);
        offset += 4;

        if (Buffer.isBuffer(entry.hash)) {
          entry.hash.copy(buffer, offset);
        } else if (typeof entry.hash === "string") {
          Buffer.from(entry.hash, "hex").copy(buffer, offset);
        }
        offset += 20;

        const nameLength = Math.min(0xFFF, entry.path.length);
        buffer.writeUInt16BE(nameLength, offset); offset += 2;

        buffer.write(entry.path, offset);
        offset += entry.path.length;
        buffer.writeUInt8(0, offset); offset += 1;

        while (offset % 8 !== 0) {
            buffer.writeUInt8(0, offset); offset += 1;
          }
      }

      const content = buffer.slice(0, offset);
      const checksum = crypto.createHash("sha1").update(content).digest();
      checksum.copy(buffer, offset);

      fs.writeFileSync(indexPath, buffer.slice(0, offset + 20));
    } catch (error) {
      console.error(`Error writing index: ${error.message}`);
    }
  }
}

module.exports = IndexOperations;
