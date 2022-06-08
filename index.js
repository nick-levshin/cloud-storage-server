const express = require('express');
const mongoose = require('mongoose');
const authRouter = require('./routes/auth.routes');
const fileRouter = require('./routes/file.routes');
const fileUpload = require('express-fileupload');
const app = express();
const PORT = process.env.PORT || 5000;
const corsMiddleware = require('./middleware/cors.middleware.js');
const filePathMiddleware = require('./middleware/filepath.middleware.js');
const path = require('path');

app.use(fileUpload({}));
app.use(corsMiddleware);
app.use(filePathMiddleware(path.resolve(__dirname, 'files')));
app.use(express.json());
app.use(express.static('static'));
app.use('/api/auth', authRouter);
app.use('/api/files', fileRouter);

const start = async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://nick-levshin:228322@cloud.acml8.mongodb.net/?retryWrites=true&w=majority'
    );

    app.listen(PORT, () => {
      console.log('Server started on port ', PORT);
    });
  } catch (e) {}
};

start();
