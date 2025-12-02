const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

if (!fs.existsSync("packs")) fs.mkdirSync("packs");

// Multer storage for 2 file fields
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = "packs/temp/";
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, sanitized);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === "file" && !file.originalname.endsWith(".pck")) {
            return cb(new Error("Only .pck files allowed"));
        }
        cb(null, true);
    }
});

// Upload endpoint
app.post("/upload",
    upload.fields([
        { name: "file", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    (req, res) => {

        const name = req.body.name?.trim();
        if (!name) return res.status(400).json({ error: "Missing name" });

        if (!req.files.file) return res.status(400).json({ error: "Missing .pck file" });
        if (!req.files.thumbnail) return res.status(400).json({ error: "Missing thumbnail" });

        const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const packFolder = `packs/${sanitizedName}`;

        // Create folder for this skinpack
        if (!fs.existsSync(packFolder)) {
            fs.mkdirSync(packFolder, { recursive: true });
        }

        // Move files into the folder
        const pckFile = req.files.file[0];
        const thumbFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

if (thumbFile) {
    fs.renameSync(thumbFile.path, `${packFolder}/thumbnail.png`);
} else {
    fs.copyFileSync("frontend/default_thumbnail.png", `${packFolder}/thumbnail.png`);
}


        fs.renameSync(pckFile.path, `${packFolder}/skinpack.pck`);
        fs.renameSync(thumbFile.path, `${packFolder}/thumbnail.png`);

        // Update list.json
        updateListJSON();

        res.json({
            success: true,
            message: "Skinpack uploaded",
            name: sanitizedName,
            folder: `/packs/${sanitizedName}`
        });
    }
);

// Serve individual pack folders
app.use("/packs", express.static(path.join(__dirname, "packs")));

// List all packs
app.get("/list", (req, res) => {
    const data = fs.readFileSync("list.json", "utf8");
    res.setHeader("Content-Type", "application/json");
    res.send(data);
});

// Generate list.json
function updateListJSON() {
    const folders = fs.readdirSync("packs", { withFileTypes: true })
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name);

    const list = folders.map(folder => ({
        name: folder,
        pck: `/packs/${folder}/skinpack.pck`,
        thumbnail: `/packs/${folder}/thumbnail.png`
    }));

    fs.writeFileSync("list.json", JSON.stringify(list, null, 4));
}

// Create initial list.json
if (!fs.existsSync("list.json")) updateListJSON();
const path = require("path");

// Serve frontend files
app.use("/", express.static(path.join(__dirname, "frontend")));


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));


