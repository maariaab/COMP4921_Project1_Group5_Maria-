const express = require("express");

const router = express.Router();

const {
    getContent,
    getRedirect,
    getText,
    recordHit
} = include("database/content");


router.get(
    "/:contentId",
    async (req, res) => {

        try {

            const contentId = req.params.contentId;


            // =====================================
            // 1. FIND CONTENT
            // =====================================

            const content = await getContent(contentId);

            if (!content) {
                return res.status(404).render("404");
            }


            // =====================================
            // 2. CHECK ACTIVE STATUS
            // =====================================

            if (!content.is_active) {
                return res.status(404).render("404");
            }


            // =====================================
            // 3. CHECK EXPIRATION
            // =====================================

            if (
                content.expires_at &&
                new Date(content.expires_at) <= new Date()
            ) {
                return res.status(404).render("404");
            }


            // =====================================
            // 4. HANDLE REDIRECT
            // =====================================

            if (content.content_type === "redirect") {

                const redirect = await getRedirect(contentId);

                // Redirect record doesn't exist
                if (!redirect || !redirect.destination_url) {
                    return res.status(404).render("404");
                }

                // Record valid visit
                await recordHit(contentId);

                // Send user to destination
                return res.redirect(redirect.destination_url);
            }


            // =====================================
            // 5. HANDLE TEXT
            // =====================================

            if (content.content_type === "text") {

                const text = await getText(contentId);

                // Text record doesn't exist
                if (!text) {
                    return res.status(404).render("404");
                }

                // Record valid visit
                await recordHit(contentId);

                return res.render(
                    "content/view-text",
                    {
                        content: text
                    }
                );
            }


            // =====================================
            // 6. UNKNOWN CONTENT TYPE
            // =====================================

            return res.status(404).render("404");

        } catch (err) {

            console.error(
                "Error opening content:",
                err
            );

            return res.status(500).send(
                "Unable to open content."
            );
        }
    }
);


module.exports = router;