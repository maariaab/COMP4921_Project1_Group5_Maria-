const {
    mysqlPool: database
} = include("databaseConnection");


async function createRedirect(
    contentData,
    destinationUrl
) {

    let connection;

    try {

        // Get one connection from the pool
        connection =
            await database.getConnection();


        // Start transaction
        await connection.beginTransaction();


        // =========================================
        // INSERT PARENT CONTENT
        // =========================================

        const contentSQL = `
            INSERT INTO content (
                content_id,
                user_id,
                title,
                content_type,
                expires_at
            )
            VALUES (
                :contentId,
                :userId,
                :title,
                'redirect',
                :expiresAt
            );
        `;


        const contentParams = {

            contentId:
                contentData.contentId,

            userId:
                contentData.userId,

            title:
                contentData.title,

            expiresAt:
                contentData.expiresAt

        };


        await connection.query(
            contentSQL,
            contentParams
        );


        // =========================================
        // INSERT REDIRECT
        // =========================================

        const redirectSQL = `
            INSERT INTO redirects (
                content_id,
                destination_url
            )
            VALUES (
                :contentId,
                :destinationUrl
            );
        `;


        const redirectParams = {

            contentId:
                contentData.contentId,

            destinationUrl:
                destinationUrl

        };


        await connection.query(
            redirectSQL,
            redirectParams
        );


        // Everything worked
        await connection.commit();

        return true;

    }
    catch (err) {

        // Undo the content INSERT if necessary
        if (connection) {

            await connection.rollback();

        }

        throw err;

    }
    finally {

        // Return connection to pool
        if (connection) {

            connection.release();

        }

    }

}

async function getRedirect(contentId) {

    const sql = `
        SELECT
            c.content_id,
            c.title,
            c.is_active,
            c.expires_at,
            r.destination_url
        FROM content c

        JOIN redirects r
            ON c.content_id =
               r.content_id

        WHERE c.content_id =
              :contentId

          AND c.content_type =
              'redirect';
    `;


    const params = {
        contentId
    };


    try {

        const [rows] =
            await database.query(
                sql,
                params
            );


        if (rows.length === 0) {

            return null;

        }


        return rows[0];

    }
    catch (err) {

        console.error(
            "Error retrieving redirect:",
            err
        );

        throw err;

    }

}

async function recordHit(contentId) {

    const sql = `
        UPDATE content
        SET
            hit_count = hit_count + 1,
            last_hit_at = CURRENT_TIMESTAMP
        WHERE content_id = :contentId;
    `;

    const params = {
        contentId
    };

    try {

        const [result] =
            await database.query(
                sql,
                params
            );

        return result.affectedRows;

    }
    catch (err) {

        console.error(
            "Error recording hit:",
            err
        );

        throw err;

    }

}

async function getRedirectsByUser(userId, search = "") {

    let sql = `
        SELECT
            c.content_id,
            c.title,
            c.is_active,
            c.hit_count,
            c.created_at,
            c.last_hit_at,

            r.destination_url,

            GROUP_CONCAT(
                cat.category_name
                ORDER BY cat.category_name
                SEPARATOR ','
            ) AS categories

        FROM content c

        JOIN redirects r
            ON c.content_id = r.content_id

        LEFT JOIN content_categories cc
            ON c.content_id = cc.content_id

        LEFT JOIN categories cat
            ON cc.category_id = cat.category_id

        WHERE c.user_id = :userId
          AND c.content_type = 'redirect'
    `;

    const params = { userId };

    if (search) {
        sql += `
            AND c.title LIKE :search
        `;

        params.search = `%${search}%`;
    }

    sql += `
        GROUP BY
            c.content_id,
            c.title,
            c.is_active,
            c.hit_count,
            c.created_at,
            c.last_hit_at,
            r.destination_url

        ORDER BY c.created_at DESC;
    `;

    const [rows] = await database.query(sql, params);

    rows.forEach(item => {
        item.categories = item.categories
            ? item.categories.split(",")
            : [];
    });

    return rows;
}

async function setContentActive(
    contentId,
    userId,
    isActive
) {

    const sql = `
        UPDATE content
        SET is_active = :isActive
        WHERE content_id = :contentId
          AND user_id = :userId;
    `;

    const params = {

        contentId,
        userId,
        isActive

    };


    try {

        const [result] =
            await database.query(
                sql,
                params
            );

        return result.affectedRows;

    }
    catch (err) {

        console.error(
            "Error changing content status:",
            err
        );

        throw err;

    }

}

async function createText(
    contentData,
    textBody
) {

    let connection;

    try {

        connection =
            await database.getConnection();


        await connection.beginTransaction();


        // =========================================
        // CONTENT
        // =========================================

        const contentSQL = `
            INSERT INTO content (
                content_id,
                user_id,
                title,
                content_type,
                expires_at
            )
            VALUES (
                :contentId,
                :userId,
                :title,
                'text',
                :expiresAt
            );
        `;


        const contentParams = {

            contentId:
                contentData.contentId,

            userId:
                contentData.userId,

            title:
                contentData.title,

            expiresAt:
                contentData.expiresAt

        };


        await connection.query(
            contentSQL,
            contentParams
        );


        // =========================================
        // TEXT CONTENT
        // =========================================

        const textSQL = `
            INSERT INTO text_content (
                content_id,
                text_body
            )
            VALUES (
                :contentId,
                :textBody
            );
        `;


        const textParams = {

            contentId:
                contentData.contentId,

            textBody:
                textBody

        };


        await connection.query(
            textSQL,
            textParams
        );


        await connection.commit();

        return true;

    }
    catch (err) {

        if (connection) {

            await connection.rollback();

        }

        throw err;

    }
    finally {

        if (connection) {

            connection.release();

        }

    }

}

async function getText(contentId) {

    const sql = `
        SELECT
            c.content_id,
            c.title,
            c.is_active,
            c.expires_at,
            t.text_body
        FROM content c

        JOIN text_content t
            ON c.content_id =
               t.content_id

        WHERE c.content_id =
              :contentId

          AND c.content_type =
              'text';
    `;


    const params = {
        contentId
    };


    try {

        const [rows] =
            await database.query(
                sql,
                params
            );


        if (rows.length === 0) {

            return null;

        }


        return rows[0];

    }
    catch (err) {

        console.error(
            "Error retrieving text:",
            err
        );

        throw err;

    }

}

async function getContent(contentId) {

    const sql = `
        SELECT
            content_id,
            title,
            content_type,
            is_active,
            expires_at
        FROM content
        WHERE content_id = :contentId;
    `;


    const params = {
        contentId
    };


    try {

        const [rows] =
            await database.query(
                sql,
                params
            );


        if (rows.length === 0) {

            return null;

        }


        return rows[0];

    }
    catch (err) {

        console.error(
            "Error retrieving content:",
            err
        );

        throw err;

    }

}

async function getBrowseContent(search = "", categoryId = "") {

    let sql = `
        SELECT
            c.content_id,
            c.title,
            c.content_type,
            c.created_at,
            t.text_body,
            i.image_url,
            i.alt_text,
            r.destination_url,

            GROUP_CONCAT(
                cat.category_name
                ORDER BY cat.category_name
                SEPARATOR ','
            ) AS categories

        FROM content c

        LEFT JOIN text_content t
            ON c.content_id = t.content_id

        LEFT JOIN image_content i
            ON c.content_id = i.content_id

        LEFT JOIN redirects r
            ON c.content_id = r.content_id

        LEFT JOIN content_categories cc
            ON c.content_id = cc.content_id

        LEFT JOIN categories cat
            ON cc.category_id = cat.category_id

        WHERE c.is_active = TRUE

          AND (
              c.expires_at IS NULL
              OR c.expires_at > CURRENT_TIMESTAMP
          )
    `;

    const params = {};

    if (search) {
        sql += ` AND c.title LIKE :search `;
        params.search = `%${search}%`;
    }

    if (categoryId) {

        sql += `
            AND EXISTS (
                SELECT 1
                FROM content_categories filter_cc
                WHERE filter_cc.content_id = c.content_id
                  AND filter_cc.category_id = :categoryId
            )
        `;

        params.categoryId = Number(categoryId);
    }

    sql += `
        GROUP BY
            c.content_id,
            c.title,
            c.content_type,
            c.created_at,
            t.text_body,
            i.image_url,
            i.alt_text,
            r.destination_url

        ORDER BY c.created_at DESC;
    `;

    const [rows] = await database.query(sql, params);

    rows.forEach(item => {
        item.categories = item.categories
            ? item.categories.split(",")
            : [];
    });

    return rows;
}

async function createImage(
    contentData,
    imageData
) {

    let connection;


    try {

        connection =
            await database.getConnection();


        await connection.beginTransaction();


        // =========================================
        // CONTENT
        // =========================================

        const contentSQL = `
            INSERT INTO content (
                content_id,
                user_id,
                title,
                content_type,
                expires_at
            )
            VALUES (
                :contentId,
                :userId,
                :title,
                'image',
                :expiresAt
            );
        `;


        await connection.query(
            contentSQL,
            {
                contentId:
                    contentData.contentId,

                userId:
                    contentData.userId,

                title:
                    contentData.title,

                expiresAt:
                    contentData.expiresAt
            }
        );


        // =========================================
        // IMAGE
        // =========================================

        const imageSQL = `
            INSERT INTO image_content (
                content_id,
                cloudinary_public_id,
                image_url,
                alt_text
            )
            VALUES (
                :contentId,
                :cloudinaryPublicId,
                :imageUrl,
                :altText
            );
        `;


        await connection.query(
            imageSQL,
            {
                contentId:
                    contentData.contentId,

                cloudinaryPublicId:
                    imageData.publicId,

                imageUrl:
                    imageData.imageUrl,

                altText:
                    imageData.altText
            }
        );


        await connection.commit();

        return true;

    }
    catch (err) {

        if (connection) {

            await connection.rollback();

        }

        throw err;

    }
    finally {

        if (connection) {

            connection.release();

        }

    }

}

async function getContentByUser(userId, categoryId = "") {

    const sql = `
        SELECT
            c.content_id,
            c.title,
            c.content_type,
            c.is_active,
            c.created_at,
            c.updated_at,
            c.expires_at,

            t.text_body,

            i.image_url,
            i.alt_text,
            i.cloudinary_public_id,

            r.destination_url,

            GROUP_CONCAT(
                cat.category_name
                ORDER BY cat.category_name
                SEPARATOR ','
            ) AS categories

        FROM content c

        LEFT JOIN text_content t
            ON c.content_id = t.content_id

        LEFT JOIN image_content i
            ON c.content_id = i.content_id

        LEFT JOIN redirects r
            ON c.content_id = r.content_id

        LEFT JOIN content_categories cc
            ON c.content_id = cc.content_id

        LEFT JOIN categories cat
            ON cc.category_id = cat.category_id

        WHERE c.user_id = :userId

        AND (
            :categoryId = ''
            OR EXISTS (
                SELECT 1
                FROM content_categories filter_cc
                WHERE filter_cc.content_id = c.content_id
                  AND filter_cc.category_id = :categoryId
            )
        )

        GROUP BY
            c.content_id,
            c.title,
            c.content_type,
            c.is_active,
            c.created_at,
            c.updated_at,
            c.expires_at,
            t.text_body,
            i.image_url,
            i.alt_text,
            i.cloudinary_public_id,
            r.destination_url

        ORDER BY c.created_at DESC;
    `;

    const [rows] = await database.query(sql, {
        userId,
        categoryId
    });

    rows.forEach(item => {
        item.categories = item.categories
            ? item.categories.split(",")
            : [];
    });

    return rows;
}

async function getContentForEdit(contentId, userId) {

    const sql = `
        SELECT
            c.content_id,
            c.title,
            c.content_type,
            c.is_active,
            c.expires_at,

            t.text_body,

            i.image_url,
            i.alt_text,
            i.cloudinary_public_id,

            r.destination_url,

        GROUP_CONCAT(cc.category_id) AS category_ids

        FROM content c

        LEFT JOIN text_content t
            ON c.content_id = t.content_id

        LEFT JOIN image_content i
            ON c.content_id = i.content_id

        LEFT JOIN redirects r
            ON c.content_id = r.content_id

        LEFT JOIN content_categories cc
            ON c.content_id = cc.content_id

        WHERE c.content_id = :contentId
          AND c.user_id = :userId

        GROUP BY
            c.content_id,
            c.title,
            c.content_type,
            c.is_active,
            c.expires_at,
            t.text_body,
            i.image_url,
            i.alt_text,
            i.cloudinary_public_id,
            r.destination_url;
    `;

    const [rows] = await database.query(sql, {
        contentId,
        userId
    });

    if (rows.length === 0) {
        return null;
    }

    const item = rows[0];

    item.category_ids = item.category_ids
        ? item.category_ids.split(",").map(Number)
        : [];

    return item;
}

async function updateText(contentId, userId, title, textBody, isActive) {

    let connection;

    try {

        connection = await database.getConnection();
        await connection.beginTransaction();

        // Update common content information.
        // user_id check provides authorization.
        const [result] = await connection.query(`
            UPDATE content
            SET
                title = :title,
                is_active = :isActive
            WHERE content_id = :contentId
              AND user_id = :userId;
        `, {
            title,
            isActive,
            contentId,
            userId
        });

        if (result.affectedRows === 0) {
            await connection.rollback();
            return false;
        }

        await connection.query(`
            UPDATE text_content
            SET text_body = :textBody
            WHERE content_id = :contentId;
        `, {
            textBody,
            contentId
        });

        await connection.commit();

        return true;

    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        throw err;

    } finally {

        if (connection) {
            connection.release();
        }
    }
}


async function updateRedirect(
    contentId,
    userId,
    title,
    destinationUrl,
    isActive
) {

    let connection;

    try {

        connection = await database.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(`
            UPDATE content
            SET
                title = :title,
                is_active = :isActive
            WHERE content_id = :contentId
              AND user_id = :userId;
        `, {
            title,
            isActive,
            contentId,
            userId
        });

        if (result.affectedRows === 0) {
            await connection.rollback();
            return false;
        }

        await connection.query(`
            UPDATE redirects
            SET destination_url = :destinationUrl
            WHERE content_id = :contentId;
        `, {
            destinationUrl,
            contentId
        });

        await connection.commit();

        return true;

    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        throw err;

    } finally {

        if (connection) {
            connection.release();
        }
    }
}

async function updateImage(
    contentId,
    userId,
    title,
    altText,
    isActive,
    imageData = null
) {

    let connection;

    try {

        connection = await database.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(`
            UPDATE content
            SET
                title = :title,
                is_active = :isActive
            WHERE content_id = :contentId
              AND user_id = :userId;
        `, {
            title,
            isActive,
            contentId,
            userId
        });

        if (result.affectedRows === 0) {
            await connection.rollback();
            return false;
        }


        // New image uploaded
        if (imageData) {

            await connection.query(`
                UPDATE image_content
                SET
                    image_url = :imageUrl,
                    cloudinary_public_id = :publicId,
                    alt_text = :altText
                WHERE content_id = :contentId;
            `, {
                imageUrl: imageData.imageUrl,
                publicId: imageData.publicId,
                altText,
                contentId
            });

        } else {

            // Keep existing image and only update alt text.

            await connection.query(`
                UPDATE image_content
                SET alt_text = :altText
                WHERE content_id = :contentId;
            `, {
                altText,
                contentId
            });

        }

        await connection.commit();

        return true;

    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        throw err;

    } finally {

        if (connection) {
            connection.release();
        }
    }
}

async function deleteContent(contentId, userId) {

    const sql = `
        DELETE FROM content
        WHERE content_id = :contentId
          AND user_id = :userId;
    `;

    const [result] = await database.query(
        sql,
        {
            contentId,
            userId
        }
    );

    return result.affectedRows;
}


async function addContentCategories(contentId, categoryIds) {

    if (!categoryIds || categoryIds.length === 0) {
        return;
    }

    const sql = `
        INSERT INTO content_categories (
            content_id,
            category_id
        )
        VALUES (
            :contentId,
            :categoryId
        );
    `;

    for (const categoryId of categoryIds) {

        await database.query(sql, {
            contentId,
            categoryId
        });

    }
}

async function updateContentCategories(
    contentId,
    userId,
    categoryIds
) {

    let connection;

    try {

        connection =
            await database.getConnection();

        await connection.beginTransaction();


        // ==========================================
        // VERIFY OWNERSHIP
        // ==========================================

        const ownershipSQL = `
            SELECT content_id
            FROM content
            WHERE content_id = :contentId
              AND user_id = :userId;
        `;

        const [rows] =
            await connection.query(
                ownershipSQL,
                {
                    contentId,
                    userId
                }
            );


        if (rows.length === 0) {

            await connection.rollback();

            return false;
        }


        // ==========================================
        // DELETE OLD CATEGORIES
        // ==========================================

        const deleteSQL = `
            DELETE FROM content_categories
            WHERE content_id = :contentId;
        `;

        await connection.query(
            deleteSQL,
            {
                contentId
            }
        );


        // ==========================================
        // INSERT NEW CATEGORIES
        // ==========================================

        const insertSQL = `
            INSERT INTO content_categories (
                content_id,
                category_id
            )
            VALUES (
                :contentId,
                :categoryId
            );
        `;


        for (const categoryId of categoryIds) {

            await connection.query(
                insertSQL,
                {
                    contentId,
                    categoryId
                }
            );
        }


        await connection.commit();

        return true;


    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        throw err;


    } finally {

        if (connection) {
            connection.release();
        }
    }
}


module.exports = {
    createRedirect,
    createText,
    createImage,
    getRedirect,
    getText,
    getContent,
    getBrowseContent,
    recordHit,
    getRedirectsByUser,
    getContentByUser,
    getContentForEdit,
    setContentActive,
    updateText, 
    updateImage,
    updateRedirect,
    addContentCategories,
    updateContentCategories,
    deleteContent
};