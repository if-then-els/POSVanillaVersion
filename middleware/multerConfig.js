// D:\projects\POS\middleware\multerConfig.js
const multer = require("multer");
const path = require("path");

// 1. Set Storage Engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/"); // Ensure this directory exists!
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// 2. File Filter for CSV and Excel
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "text/csv", // .csv
    "application/csv", // Some systems might send this
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only CSV and Excel files are allowed!"),
      false
    );
  }
};

// 3. Initialize the Multer INSTANCE (without calling .single() or .array() yet)
const multerInstance = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Example: 5 MB file size limit
  fileFilter: fileFilter,
});

// Export the Multer INSTANCE
module.exports = multerInstance;
