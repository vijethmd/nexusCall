const path = require("path");

// POST /api/upload — Accepts a single file, returns its public URL
const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file provided." });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const isPdf = ext === ".pdf";

  return res.status(200).json({
    success: true,
    file: {
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      type: isPdf ? "pdf" : "image",
    },
  });
};

module.exports = { uploadFile };
