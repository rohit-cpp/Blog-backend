import multer from "multer";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();
const uploadFile = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"));
        }
    },
}).single("file");

export default uploadFile;
