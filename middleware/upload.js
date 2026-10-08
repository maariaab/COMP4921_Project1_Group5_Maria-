const multer = require("multer");

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {

    if (file.mimetype.startsWith("image/")) {
        return cb(null, true);
    }

    cb(
        new Error("Only image files are allowed."),
        false
    );
};

const upload = multer({

    storage,

    limits: {

        fileSize:
            5 * 1024 * 1024

    },

    fileFilter: (
        req,
        file,
        callback
    ) => {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];


        if (
            allowedTypes.includes(
                file.mimetype
            )
        ) {

            callback(
                null,
                true
            );

        }
        else {

            callback(
                new Error(
                    "Only JPG, PNG, WebP, and GIF images are allowed."
                )
            );

        }

    }

});


module.exports = upload;