const express = require("express");
const { protect } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { uploadFile } = require("../controllers/uploadController");

const router = express.Router();

// Protected — only authenticated users can upload files into meetings
router.post("/", protect, upload.single("file"), uploadFile);

module.exports = router;
