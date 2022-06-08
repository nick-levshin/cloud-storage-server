const fileService = require('../services/fileService');
const User = require('../models/User');
const File = require('../models/File');
const path = require('path');
const fs = require('fs');
const Uuid = require('uuid');
const sep = path.sep;

class FileController {
  async createDir(req, res) {
    try {
      const { name, type, parent } = req.body;
      const file = new File({ name, type, parent, user: req.user.id });
      const parentFile = await File.findOne({ _id: parent });
      if (!parentFile) {
        file.path = name;
        await fileService.createDir(req, file);
      } else {
        file.path = parentFile.path + sep + file.name;
        await fileService.createDir(req, file);
        parentFile.childs.push(file._id);
        await parentFile.save();
      }
      await file.save();
      return res.json(file);
    } catch (e) {
      console.log(e);
      return res.status(400).json(e);
    }
  }

  async getFiles(req, res) {
    try {
      const { sort } = req.query;
      let files;

      switch (sort) {
        case 'name':
          files = await File.find({
            user: req.user.id,
            parent: req.query.parent,
          }).sort({ name: 1 });
          break;

        case 'type':
          files = await File.find({
            user: req.user.id,
            parent: req.query.parent,
          }).sort({ type: 1 });
          break;

        case 'date':
          files = await File.find({
            user: req.user.id,
            parent: req.query.parent,
          }).sort({ date: 1 });
          break;

        case 'size':
          files = await File.find({
            user: req.user.id,
            parent: req.query.parent,
          }).sort({ size: 1 });
          break;

        default:
          files = await File.find({
            user: req.user.id,
            parent: req.query.parent,
          });
      }

      return res.json(files);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Can not get files' });
    }
  }

  async uploadFile(req, res) {
    try {
      const file = req.files.file;

      const parent = await File.findOne({
        user: req.user.id,
        _id: req.body.parent,
      });

      const user = await User.findOne({ _id: req.user.id });

      if (user.userSpace + file.size > user.diskSpace) {
        return res.status(400).json({ message: 'No disk space' });
      }

      user.userSpace = user.userSpace + file.size;

      let path;
      if (parent) {
        path =
          req.filePath + sep + user._id + sep + parent.path + sep + file.name;
      } else {
        path = req.filePath + sep + user._id + sep + file.name;
      }

      if (fs.existsSync(path)) {
        return res.status(400).json({ message: 'File already exists' });
      }

      file.mv(path);

      const type = file.name.split('.').pop();
      let filePath = file.name;
      if (parent) {
        filePath = parent.path + sep + file.name;
      }
      const dbFile = new File({
        name: file.name,
        type,
        size: file.size,
        path: filePath,
        parent: parent ? parent._id : null,
        user: user._id,
      });

      await dbFile.save();
      await user.save();

      if (parent) {
        parent.childs.push(dbFile._id);
        await fileService.updateSize(dbFile, dbFile.size);
        await parent.save();
      }

      return res.json(dbFile);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Upload files' });
    }
  }

  async downloadFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
      const parent = await File.findOne({
        user: req.user.id,
        _id: req.body.parent,
      });

      if (parent) {
        parent.childs.filter((child) => child._id !== file._id);
        parent.save();
      }

      const path = fileService.getPath(req, file);
      if (fs.existsSync(path)) {
        return res.download(path, file.name);
      }
      return res.status(400).json({ message: 'File was not found' });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'Download error' });
    }
  }

  async deleteFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
      const user = await User.findOne({ _id: req.user.id });
      const parent = await File.findOne({
        user: req.user.id,
        _id: file.parent,
      });

      if (!file) {
        return res.status(400).json({ message: 'File was not found' });
      }

      if (parent) {
        const asyncFilter = async (arr, predicate) => {
          const results = await Promise.all(arr.map(predicate));
          return arr.filter((_v, index) => results[index]);
        };

        parent.childs = await asyncFilter(parent.childs, async (child) => {
          const fileData = await File.findOne({
            _id: child,
          });

          return !fileData._id.equals(file._id);
        });

        await fileService.updateSize(file, -file.size);
        await parent.save();
      }

      await fileService.deleteFile(req, file);
      if (file.childs.length) {
        const size = await fileService.deleteDirectory(file);
        user.userSpace = user.userSpace - size;
      } else {
        await file.remove();
        user.userSpace = user.userSpace - file.size;
      }
      await user.save();

      return res.json({ message: 'File was deleted' });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'Delete error' });
    }
  }

  async searchFiles(req, res) {
    try {
      const searchName = req.query.search;
      let files = await File.find({ user: req.user.id });
      files = files.filter((file) =>
        file.name.toLowerCase().includes(searchName.toLowerCase())
      );

      return res.json(files);
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: 'Search error' });
    }
  }

  async uploadAvatar(req, res) {
    try {
      const file = req.files.file;
      const user = await User.findById(req.user.id);
      const avatarName = Uuid.v4() + '.jpg';
      file.mv(
        '/home/nick-levshin/Programming/storage/server/static' +
          sep +
          avatarName
      );
      user.avatar = avatarName;

      await user.save();
      return res.json(user);
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: 'Upload avatar error' });
    }
  }

  async deleteAvatar(req, res) {
    try {
      const user = await User.findById(req.user.id);
      fs.unlinkSync(
        '/home/nick-levshin/Programming/storage/server/static' +
          sep +
          user.avatar
      );
      user.avatar = null;

      await user.save();
      return res.json(user);
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: 'Delete avatar error' });
    }
  }
}

module.exports = new FileController();
