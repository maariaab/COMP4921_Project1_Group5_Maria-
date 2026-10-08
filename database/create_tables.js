const { mysqlPool: database } = include('databaseConnection');

async function createTables() {

    const createUsersSQL = `
        CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(25) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `;


    const createContentSQL = `
        CREATE TABLE IF NOT EXISTS content (
            content_id VARCHAR(12) PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255),
            content_type ENUM('text', 'image', 'redirect') NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            hit_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
            last_hit_at TIMESTAMP NULL DEFAULT NULL,
            expires_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

            CONSTRAINT fk_content_user
                FOREIGN KEY (user_id)
                REFERENCES users(user_id)
                ON DELETE CASCADE
        );
    `;

    const createTextContentSQL = `
        CREATE TABLE IF NOT EXISTS text_content (
            content_id VARCHAR(12) PRIMARY KEY,
            text_body TEXT NOT NULL,

            CONSTRAINT fk_text_content
                FOREIGN KEY (content_id)
                REFERENCES content(content_id)
                ON DELETE CASCADE,

            FULLTEXT INDEX ft_text_body (text_body)
        );
    `;

    const createImageContentSQL = `
        CREATE TABLE IF NOT EXISTS image_content (
            content_id VARCHAR(12) PRIMARY KEY,
            cloudinary_public_id VARCHAR(255) NOT NULL,
            image_url VARCHAR(2048) NOT NULL,
            alt_text VARCHAR(255),

            CONSTRAINT fk_image_content
                FOREIGN KEY (content_id)
                REFERENCES content(content_id)
                ON DELETE CASCADE
        );
    `;

    const createRedirectsSQL = `
        CREATE TABLE IF NOT EXISTS redirects (
            content_id VARCHAR(12) PRIMARY KEY,
            destination_url VARCHAR(2048) NOT NULL,

            CONSTRAINT fk_redirect_content
                FOREIGN KEY (content_id)
                REFERENCES content(content_id)
                ON DELETE CASCADE
        );
    `;


    const createFavoritesSQL = `
        CREATE TABLE IF NOT EXISTS favorites (
            user_id INT NOT NULL,
            content_id VARCHAR(12) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (user_id, content_id),

            CONSTRAINT fk_favorite_user
                FOREIGN KEY (user_id)
                REFERENCES users(user_id)
                ON DELETE CASCADE,

            CONSTRAINT fk_favorite_content
                FOREIGN KEY (content_id)
                REFERENCES content(content_id)
                ON DELETE CASCADE
        );
    `;

    const createCategoriesSQL = `
        CREATE TABLE IF NOT EXISTS categories (
            category_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(50) NOT NULL UNIQUE

        );

    `;

    const createContentCategoriesSQL = `
        CREATE TABLE IF NOT EXISTS content_categories (
            content_id VARCHAR(12) NOT NULL,    
            category_id TINYINT UNSIGNED NOT NULL,

            PRIMARY KEY (content_id, category_id),

            CONSTRAINT fk_content_category_content
                FOREIGN KEY (content_id)
                REFERENCES content(content_id)
                ON DELETE CASCADE,

            CONSTRAINT fk_content_category_category
                FOREIGN KEY (category_id)
                REFERENCES categories(category_id)
                ON DELETE CASCADE
        );

    `;

    const insertCategoriesSQL = `
        INSERT IGNORE INTO categories (category_name)
            VALUES
                ('Education'),
                ('Humor'),
                ('Technology'),
                ('Entertainment');
    `;

    


    try {

        await database.query(createUsersSQL);
        await database.query(createContentSQL);
        await database.query(createTextContentSQL);
        await database.query(createImageContentSQL);
        await database.query(createRedirectsSQL);
        await database.query(createFavoritesSQL);
        await database.query(createCategoriesSQL); 
        await database.query(createContentCategoriesSQL);
        await database.query(insertCategoriesSQL);

        console.log("Successfully created all tables");

        return true;
    }
    catch (err) {
        console.log("Error creating tables");
        console.log(err);

        return false;
    }
}

module.exports = { createTables };