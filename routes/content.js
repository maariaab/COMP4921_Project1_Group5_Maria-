const express = require("express");

const router = express.Router();

const {requireLogin} = include("middleware/auth");

router.get("/test", (req, res) => {
    res.send("Content router works");
});


const {
    createRedirect,
    createText,
    createImage,
    getRedirect,
    getBrowseContent,
    getRedirectsByUser,
    getContentByUser,
    getContentForEdit,
    updateText,
    updateRedirect,
    updateImage,
    setContentActive,
    addContentCategories, 
    updateContentCategories,
    deleteContent
} = include("database/content");

const upload = include("middleware/upload");
const {uploadImage, deleteImage} = include("utils/imageUpload");
const {generateContentId, validateContentId} = include("utils/contentId");
const {formatMonthDay} = include("utils/date");


// =========================================================
// BROWSE CONTENT
// =========================================================

router.get("/", async (req, res) => {

    try {

        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : "";

        const allowedCategories = ["1", "2", "3", "4"];

        const requestedCategory = req.query.category;

        const categoryId =
            typeof requestedCategory === "string" &&
            allowedCategories.includes(requestedCategory)
                ? requestedCategory
                : "";

        const content = await getBrowseContent(
            search,
            categoryId
        );

        res.render("content/browse", {
            content,
            search,
            categoryId,
            baseUrl: `${req.protocol}://${req.get("host")}`
        });

    } catch (err) {

        console.error("Error loading content:", err);

        res.status(500).send(
            "Unable to load content."
        );
    }
});

// =========================================================
// CREATE CONTENT
// =========================================================

router.get(
    "/create",
    requireLogin,
    (req, res) => {

        res.render("dashboard");

    }
);

// =========================================================
// USER CONTENT
// =========================================================

router.get("/stats", requireLogin, async (req, res) => {

    try {

        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : "";

        const links = await getRedirectsByUser(
            req.session.userId,
            search
        );

        res.render("content/stats", {
            content: links,
            search,
            formatMonthDay
        });

    } catch (err) {

        console.error(
            "Error loading link statistics:",
            err
        );

        res.status(500).send(
            "Unable to load link statistics."
        );
    }
});

// =========================================================
// CREATE LINK
// =========================================================

router.get(
    "/create/link",
    requireLogin,
    (req, res) => {
        res.render("content/create-link", {
            error: null, 
            createdLinkId: null
        });
        

    }
    

);


router.post(
    "/create/link",
    requireLogin,
    async (req, res) => {

        try {

            const {
                title,
                destinationUrl,
                customId
            } = req.body;

            // =====================================
            // 1. VALIDATE DESTINATION URL
            // =====================================

            const cleanDestinationUrl =
                typeof destinationUrl === "string"
                    ? destinationUrl.trim()
                    : "";

            if (!cleanDestinationUrl) {

                return res.status(400).render(
                    "content/create-link",
                    {
                        error: "Destination URL is required.",
                        createdLinkId: null
                    }
                );
            }

            // Only allow HTTP and HTTPS URLs.
            try {

                const url = new URL(cleanDestinationUrl);

                if (
                    url.protocol !== "http:" &&
                    url.protocol !== "https:"
                ) {
                    throw new Error("Invalid protocol");
                }

            } catch {

                return res.status(400).render(
                    "content/create-link",
                    {
                        error:
                            "Please enter a valid HTTP or HTTPS URL.",
                        createdLinkId: null
                    }
                );
            }


            // =====================================
            // 2. GET SELECTED CATEGORIES
            // =====================================

            const allowedCategories = ["1", "2", "3", "4"];

            const categories = [
                ...new Set(
                    []
                        .concat(req.body.categories || [])
                        .filter(category =>
                            allowedCategories.includes(category)
                        )
                )
            ];


            // =====================================
            // 3. PREPARE CONTENT INFORMATION
            // =====================================

            const cleanTitle =
                typeof title === "string"
                    ? title.trim()
                    : "";

            const cleanCustomId =
                typeof customId === "string"
                    ? customId.trim()
                    : "";

            const hasCustomId = cleanCustomId.length > 0;

            const userId = req.session.userId;

            let contentId;


            // =====================================
            // 4. CUSTOM URL
            // =====================================

            if (hasCustomId) {

                contentId = cleanCustomId;

                if (!validateContentId(contentId)) {

                    return res.status(400).render(
                        "content/create-link",
                        {
                            error:
                                "Custom URL must be 3-12 " +
                                "characters and contain only " +
                                "letters, numbers, hyphens, " +
                                "or underscores.",
                            createdLinkId: null
                        }
                    );
                }

                const contentData = {
                    contentId,
                    userId,
                    title: cleanTitle || null,
                    expiresAt: null
                };

                try {

                    await createRedirect(
                        contentData,
                        cleanDestinationUrl
                    );

                } catch (err) {

                    if (err.code === "ER_DUP_ENTRY") {

                        return res.status(409).render(
                            "content/create-link",
                            {
                                error:
                                    "That custom URL is already in use.",
                                createdLinkId: null
                            }
                        );
                    }

                    throw err;
                }

            }

            // =====================================
            // 5. AUTOMATICALLY GENERATED URL
            // =====================================

            else {

                const maxAttempts = 5;

                let created = false;

                for (
                    let attempt = 0;
                    attempt < maxAttempts;
                    attempt++
                ) {

                    contentId = generateContentId();

                    const contentData = {
                        contentId,
                        userId,
                        title: cleanTitle || null,
                        expiresAt: null
                    };

                    try {

                        await createRedirect(
                            contentData,
                            cleanDestinationUrl
                        );

                        created = true;

                        break;

                    } catch (err) {

                        if (err.code === "ER_DUP_ENTRY") {

                            // Generate another ID.
                            continue;
                        }

                        throw err;
                    }
                }

                if (!created) {

                    return res.status(500).render(
                        "content/create-link",
                        {
                            error:
                                "Unable to generate a unique URL. " +
                                "Please try again.",
                            createdLinkId: null
                        }
                    );
                }
            }


            // =====================================
            // 6. SAVE CATEGORIES
            // =====================================

            await addContentCategories(
                contentId,
                categories
            );


            // =====================================
            // 7. SUCCESS
            // =====================================

            return res.render(
                "content/create-link",
                {
                    error: null,
                    createdLinkId: contentId
                }
            );

        } catch (err) {

            console.error(
                "Error creating link:",
                err
            );

            return res.status(500).render(
                "content/create-link",
                {
                    error: "Unable to create link.",
                    createdLinkId: null
                }
            );
        }
    }
);


/////
router.get(
    "/view/:contentId",
    async (req, res) => {

        try {

            const contentId =
                req.params.contentId;


            const redirect =
                await getRedirect(contentId);


            if (!redirect) {

                return res.status(404).render(
                    "404"
                );

            }


            if (!redirect.is_active) {

                return res.status(404).send(
                    "Content is not available."
                );

            }


            if (
                redirect.expires_at &&
                new Date(redirect.expires_at) <=
                    new Date()
            ) {

                return res.status(404).send(
                    "Content is not available."
                );

            }


            res.redirect(
                redirect.destination_url
            );

        }
        catch (err) {

            console.error(
                "Error opening content:",
                err
            );


            res.status(500).send(
                "Unable to open content."
            );

        }

    }
);

router.post(
    "/:contentId/status",
    requireLogin,
    async (req, res) => {

        try {

            const contentId =
                req.params.contentId;

            const isActive =
                req.body.isActive === "true";


            const affectedRows =
                await setContentActive(
                    contentId,
                    req.session.userId,
                    isActive
                );


            if (affectedRows === 0) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Unable to modify this content."
                });

            }


            res.json({
                success: true
            });

        }
        catch (err) {

            console.error(
                "Status update error:",
                err
            );

            res.status(500).json({
                success: false
            });

        }

    }
);

// =========================================================
// CREATE IMAGE
// =========================================================

router.get(
    "/create/image",
    requireLogin,
    (req, res) => {

        res.render("content/create-image", {
            error: null
        });

    }
);

router.post(
    "/create/image",
    requireLogin,
    upload.single("image"),
    async (req, res) => {

        try {

            const {
                title,
                altText
            } = req.body;

            // =====================================
            // CATEGORIES
            // =====================================

            const allowedCategories = ["1", "2", "3", "4"];

            const categories = [
                ...new Set(
                    []
                        .concat(req.body.categories || [])
                        .filter(category =>
                            allowedCategories.includes(category)
                        )
                )
            ];


            // =====================================
            // VALIDATE
            // =====================================

            if (!title) {

                return res
                    .status(400)
                    .render(
                        "content/create-image",
                        {
                            error:
                                "Title is required."
                        }
                    );

            }


            if (!req.file) {

                return res
                    .status(400)
                    .render(
                        "content/create-image",
                        {
                            error:
                                "Please select an image."
                        }
                    );

            }


            // =====================================
            // UPLOAD TO CLOUDINARY
            // =====================================

            const cloudinaryResult =
                await uploadImage(
                    req.file.buffer
                );


            // =====================================
            // GENERATE INTERNAL CONTENT ID
            // =====================================

            const maxAttempts = 5;

            let contentId;

            let created = false;


            for (
                let attempt = 0;
                attempt < maxAttempts;
                attempt++
            ) {

                contentId =
                    generateContentId();


                const contentData = {

                    contentId,

                    userId:
                        req.session.userId,

                    title:
                        title.trim(),

                    expiresAt:
                        null

                };


                const imageData = {

                    publicId:
                        cloudinaryResult.publicId,

                    imageUrl:
                        cloudinaryResult.imageUrl,

                    altText:
                        altText
                            ? altText.trim()
                            : null

                };


                try {

                    await createImage(
                        contentData,
                        imageData
                    );

                    created = true;

                    break;

                }
                catch (err) {

                    if (
                        err.code ===
                        "ER_DUP_ENTRY"
                    ) {

                        continue;

                    }

                    throw err;

                }

            }


            if (!created) {

            await deleteImage(
                cloudinaryResult.publicId
            );

            return res
            .status(500)
            .render(
                "content/create-image",
                {
                    error:
                        "Unable to create image content."
                }
            );

        }

        await addContentCategories(
            contentId,
            categories
        );

            // =====================================
            // SUCCESS
            // =====================================

            res.redirect("/content");

        }
        catch (err) {

            console.error(
                "Image upload error:",
                err
            );


            res.status(500).render(
                "content/create-image",
                {
                    error:
                        "Unable to upload image."
                }
            );

        }

    }
);


// =========================================================
// CREATE TEXT
// =========================================================

router.get(
    "/create/text",
    requireLogin,
    (req, res) => {

        res.render("content/create-text", {
            error: null
        });

    }
);

router.post(
    "/create/text",
    requireLogin,
    async (req, res) => {

        try {

            const {
                title,
                textBody
            } = req.body;
            
            const categories = req.body.categories
                ? [].concat(req.body.categories)
                : [];

            if (!title || !textBody) {

                return res
                    .status(400)
                    .render(
                        "content/create-text",
                        {
                            error:
                                "Title and text are required."
                        }
                    );

            }


            const maxAttempts = 5;

            let contentId;
            let created = false;


            for (
                let attempt = 0;
                attempt < maxAttempts;
                attempt++
            ) {

                contentId =
                    generateContentId();


                const contentData = {

                    contentId,

                    userId:
                        req.session.userId,

                    title:
                        title.trim(),

                    expiresAt:
                        null

                };


                try {

                    await createText(
                        contentData,
                        textBody
                    );

                    await addContentCategories(
                        contentId,
                        categories
                    );

                    created = true;

                    break;

                }
                catch (err) {

                    if (
                        err.code ===
                        "ER_DUP_ENTRY"
                    ) {

                        continue;

                    }

                    throw err;

                }

            }


            if (!created) {

                return res
                    .status(500)
                    .render(
                        "content/create-text",
                        {
                            error:
                                "Unable to create text."
                        }
                    );

            }


            res.redirect("/content");

        }
        catch (err) {

            console.error(
                "Error creating text:",
                err
            );


            res.status(500).render(
                "content/create-text",
                {
                    error:
                        "Unable to create text."
                }
            );

        }

    }
);

router.get("/mine", requireLogin, async (req, res) => {

    try {

        const allowedCategories = ["1", "2", "3", "4"];

        const requestedCategory = req.query.category;

        const categoryId =
            typeof requestedCategory === "string" &&
            allowedCategories.includes(requestedCategory)
                ? requestedCategory
                : "";

        const content = await getContentByUser(
            req.session.userId,
            categoryId
        );

        res.render("content/mine", {
            content,
            categoryId
        });

    } catch (err) {

        console.error(
            "Error loading user's content:",
            err
        );

        res.status(500).send(
            "Unable to load your content."
        );
    }
});

router.get(
    "/:contentId/edit",
    requireLogin,
    async (req, res) => {

        try {

            const item = await getContentForEdit(
                req.params.contentId,
                req.session.userId
            );

            if (!item) {
                return res.status(400).send(
                    "You cannot edit this content."
                );
            }

            res.render("content/edit", {
                item,
                error: null
            });

        } catch (err) {

            console.error(
                "Error loading content for edit:",
                err
            );

            res.status(500).send(
                "Unable to edit content."
            );
        }
    }
);

router.post(
    "/:contentId/edit",
    requireLogin,
    upload.single("image"),
    async (req, res) => {

        const contentId = req.params.contentId;
        const userId = req.session.userId;

        const title = req.body.title?.trim();
       // const isActive = req.body.isActive === "true";

        // ==========================================
        // CATEGORIES
        // ==========================================

        const allowedCategories = ["1", "2", "3", "4"];

        const categories = req.body.categories
            ? [].concat(req.body.categories)
                .filter(category =>
                    allowedCategories.includes(category)
                )
            : [];

        // Used to keep track of a newly uploaded
        // Cloudinary image in case cleanup is needed.
        let newCloudinaryImage = null;


        try {

            // ==========================================
            // 1. VERIFY OWNERSHIP
            // ==========================================

            const item = await getContentForEdit(
                contentId,
                userId
            );

            // Content either does not exist or does not
            // belong to the logged-in user.
            if (!item) {
                return res
                    .status(400)
                    .render("404");
            }


            // ==========================================
            // 2. VALIDATE TITLE
            // ==========================================

            if (!title) {

                return res
                    .status(400)
                    .render(
                        "content/edit",
                        {
                            item,
                            error: "Title is required."
                        }
                    );
            }


            // ==========================================
            // 3. EDIT TEXT
            // ==========================================

            if (item.content_type === "text") {

                const textBody =
                    req.body.textBody?.trim();

                if (!textBody) {

                    return res
                        .status(400)
                        .render(
                            "content/edit",
                            {
                                item,
                                error:
                                    "Text cannot be empty."
                            }
                        );
                }


                const updated = await updateText(
                    contentId,
                    userId,
                    title,
                    textBody
                );


                if (!updated) {

                    return res
                        .status(400)
                        .render("404");
                }
            }


            // ==========================================
            // 4. EDIT REDIRECT
            // ==========================================

            else if (item.content_type === "redirect") {

                const destinationUrl =
                    req.body.destinationUrl?.trim();


                if (!destinationUrl) {

                    return res
                        .status(400)
                        .render(
                            "content/edit",
                            {
                                item,
                                error:
                                    "Destination URL is required."
                            }
                        );
                }


                // Validate URL server-side.
                try {

                    const url =
                        new URL(destinationUrl);

                    if (
                        url.protocol !== "http:" &&
                        url.protocol !== "https:"
                    ) {

                        return res
                            .status(400)
                            .render(
                                "content/edit",
                                {
                                    item,
                                    error:
                                        "URL must use HTTP or HTTPS."
                                }
                            );
                    }

                } catch {

                    return res
                        .status(400)
                        .render(
                            "content/edit",
                            {
                                item,
                                error:
                                    "Please enter a valid URL."
                            }
                        );
                }


                const updated =
                    await updateRedirect(
                        contentId,
                        userId,
                        title,
                        destinationUrl,
                       // isActive
                    );


                if (!updated) {

                    return res
                        .status(400)
                        .render("404");
                }
            }


            // ==========================================
            // 5. EDIT IMAGE
            // ==========================================

            else if (item.content_type === "image") {

                const altText =
                    req.body.altText?.trim() || null;


                // Upload a replacement image if one
                // was selected.
                if (req.file) {

                    newCloudinaryImage =
                        await uploadImage(
                            req.file.buffer
                        );
                }


                const updated =
                    await updateImage(
                        contentId,
                        userId,
                        title,
                        altText,
                        newCloudinaryImage
                    );


                if (!updated) {

                    // The DB update failed, so remove
                    // the newly uploaded Cloudinary file.
                    if (newCloudinaryImage) {

                        await deleteImage(
                            newCloudinaryImage.publicId
                        );

                        newCloudinaryImage = null;
                    }


                    return res
                        .status(400)
                        .render("404");
                }


                // The database now references the new
                // image, so the old Cloudinary image
                // can be deleted.
                if (
                    newCloudinaryImage &&
                    item.cloudinary_public_id
                ) {

                    await deleteImage(
                        item.cloudinary_public_id
                    );

                    // The new image is now successfully
                    // being used. Prevent catch() from
                    // deleting it.
                    newCloudinaryImage = null;
                }
            }


            // ==========================================
            // 6. UNKNOWN CONTENT TYPE
            // ==========================================

            else {

                return res
                    .status(400)
                    .render("404");
            }


            // ==========================================
            // 7. UPDATE CATEGORIES
            // ==========================================

            const categoriesUpdated =
                await updateContentCategories(
                    contentId,
                    userId,
                    categories
                );


            if (!categoriesUpdated) {

                return res
                    .status(400)
                    .render("404");
            }


            // ==========================================
            // 8. SUCCESS
            // ==========================================

            return res.redirect("/content/mine");


        } catch (err) {

            console.error(
                "Error editing content:",
                err
            );


            // ==========================================
            // CLEAN UP NEW CLOUDINARY IMAGE
            // ==========================================

            // If a replacement image was uploaded but
            // something failed before completion,
            // remove the orphaned image.
            if (newCloudinaryImage) {

                try {

                    await deleteImage(
                        newCloudinaryImage.publicId
                    );

                } catch (cleanupErr) {

                    console.error(
                        "Unable to clean up image:",
                        cleanupErr
                    );
                }
            }


            return res
                .status(500)
                .send("Unable to update content.");
        }
    }
);

router.post(
    "/:contentId/delete",
    requireLogin,
    async (req, res) => {

        const contentId = req.params.contentId;
        const userId = req.session.userId;

        try {

            // Get the content first so we know its type
            // and Cloudinary ID if it is an image.
            const item = await getContentForEdit(
                contentId,
                userId
            );

            if (!item) {
                return res.status(400).render("404");
            }


            // Delete database content.
            const deleted = await deleteContent(
                contentId,
                userId
            );

            if (!deleted) {
                return res.status(400).render("404");
            }


            // If it was an image, also remove the
            // actual file from Cloudinary.
            if (
                item.content_type === "image" &&
                item.cloudinary_public_id
            ) {

                await deleteImage(
                    item.cloudinary_public_id
                );
            }


            return res.redirect("/content/mine");

        } catch (err) {

            console.error(
                "Error deleting content:",
                err
            );

            return res.status(500).send(
                "Unable to delete content."
            );
        }
    }
);


module.exports = router;