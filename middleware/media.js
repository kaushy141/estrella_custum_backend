const multer = require("multer");
const { getRandomDirName } = require("./commonFunction");
const fs = require("fs");
const path = require("path");

function uploadMiddleware(folderName, namePrefix = null) {
  try {
    return multer({
      storage: multer.diskStorage({
        destination: function (req, file, cb) {
          const path2 = `media/${folderName}/${getRandomDirName(2)}`;
          fs.mkdirSync(path2, { recursive: true });
          cb(null, path2);
        },

        // By default, multer removes file extensions so let's add them back
        filename: function (req, file, cb) {
          cb(
            null,
            (namePrefix ? namePrefix : "") +
            Date.now() +
            path.extname(file.originalname)
          );
        },
      }),
      limits: { fileSize: 100000000 },
      fileFilter: function (req, file, cb) {
        if (
          !file.originalname.match(
            /\.(jpg|JPG|webp|jpeg|JPEG|png|PNG|gif|GIF|jfif|JFIF|pdf|PDF|xlsx|XLS|XLSX|doc|DOC|docx|DOCX|txt|TXT|csv|CSV)$/
          )
        ) {
          req.fileValidationError = "Only image files are allowed!";
          return cb(null, false);
        }
        cb(null, true);
      },
    });
  } catch (err) {
    console.log("Media upload error", err.toString());
  }
}

function getMediaUrl(filePath) {
  return 'https://backend.estrellajewels.com/' + filePath;
}

module.exports = { uploadMiddleware, getMediaUrl };
