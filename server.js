const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

// Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, sanitized);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.originalname.endsWith(".pck")) {
            return cb(new Error("Only .pck files allowed!"));
        }
        cb(null, true);
    }
});

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
    console.log("Uploaded:", req.file.originalname);

    updateListJSON();

    res.json({
        success: true,
        message: "Uploaded successfully",
        file: req.file.originalname
    });
});

// Serve uploaded files
app.use("/packs", express.static(path.join(__dirname, "uploads")));

// Return list.json
app.get("/list", (req, res) => {
    const listData = fs.readFileSync("list.json", "utf8");
    res.setHeader("Content-Type", "application/json");
    res.send(listData);
});

// Generate list.json automatically
function updateListJSON() {
    const files = fs.readdirSync("uploads").filter(f => f.endsWith(".pck"));

    const list = files.map(filename => ({
        name: filename.replace(".pck", ""),
        filename,
        url: `/packs/${filename}`
    }));

    fs.writeFileSync("list.json", JSON.stringify(list, null, 4));
}

// Create list.json if missing
if (!fs.existsSync("list.json")) {
    updateListJSON();
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Server running on port", port);
});
