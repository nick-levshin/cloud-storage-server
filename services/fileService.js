const fs = require('fs');
const File = require('../models/File');
const path = require('path');
const sep = path.sep;

class FileService {
  createDir(req, file) {
    const filePath = this.getPath(req, file);
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(file)) {
          fs.mkdirSync(filePath);
          return resolve({ message: 'File was created' });
        } else {
          return reject({ message: 'File already exists' });
        }
      } catch (e) {
        return reject({ message: 'File error' });
      }
    });
  }

  deleteFile(req, file) {
    const path = this.getPath(req, file);
    if (file.type === 'dir') {
      fs.rmSync(path, { recursive: true });
    } else {
      fs.unlinkSync(path);
    }
  }

  getPath(req, file) {
    return req.filePath + sep + file.user + sep + file.path;
  }

  async deleteDirectory(dir, size = 0) {
    dir.childs.forEach(async (child) => {
      const file = await File.findOne({
        _id: child,
      });
      if (file.childs.length) {
        size += await this.deleteDirectory(file, size);
      } else {
        size += file.size;
        await file.remove();
      }
    });

    await dir.remove();
    return size;
  }

  async updateSize(file, size) {
    const fileParent = await File.findOne({
      _id: file.parent,
    });
    if (fileParent.parent) {
      fileParent.size += size;
      await fileParent.save();
      await this.updateSize(fileParent, size);
    } else {
      fileParent.size += size;
      await fileParent.save();
    }
  }
}

module.exports = new FileService();
