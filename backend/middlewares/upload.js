const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Upload directory
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Leading bytes each allowed file type must start with
const PDF = Buffer.from("%PDF-");
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const signatures = {
  ".jpg": JPEG,
  ".jpeg": JPEG,
  ".png": PNG,
  ".pdf": PDF,
  ".doc": OLE,
  ".docx": ZIP,
};

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const invalidFileError = () => {
  const error = new Error(
    "Only JPG, JPEG, PNG, PDF, DOC and DOCX files are allowed"
  );

  error.statusCode = 400;

  return error;
};

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueName + path.extname(file.originalname).toLowerCase()
    );
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (
    signatures[extension] &&
    allowedMimeTypes.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

  cb(invalidFileError());
};

// Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Deletes the request's uploaded file, if any. Used when a request fails
// after the upload so rejected requests leave nothing on disk.
const discardUpload = async (req) => {
  if (!req.file) return;

  const filePath = req.file.path;
  req.file = undefined;

  await fs.promises.unlink(filePath).catch(() => {});
};

// The extension and MIME type come from the client, so confirm the stored
// file really starts with the bytes its extension promises.
const verifyUpload = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const expected = signatures[path.extname(req.file.filename)];
    const header = Buffer.alloc(expected.length);

    const handle = await fs.promises.open(req.file.path, "r");

    try {
      await handle.read(header, 0, expected.length, 0);
    } finally {
      await handle.close();
    }

    if (header.equals(expected)) return next();

    await discardUpload(req);

    next(invalidFileError());
  } catch (err) {
    await discardUpload(req);

    next(err);
  }
};

// Route middleware: accept one "attachment" file and verify its contents
const attachmentUpload = [upload.single("attachment"), verifyUpload];

module.exports = { attachmentUpload, discardUpload, uploadDir };
