const multer = require('multer');
const path   = require('path');

const ALLOWED = /jpeg|jpg|png|gif|webp/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ok = ALLOWED.test(path.extname(file.originalname).toLowerCase())
            && ALLOWED.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed.'));
  },
});

module.exports = upload;
