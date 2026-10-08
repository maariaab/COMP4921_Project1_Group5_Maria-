const { mysqlPool: database } = include('databaseConnection');


async function createUser(userData) {

    const createUserSQL = `
        INSERT INTO users (
            username,
            email,
            password_hash
        )
        VALUES (
            :username,
            :email,
            :passwordHash
        );
    `;

    const params = {
        username: userData.username,
        email: userData.email,
        passwordHash: userData.passwordHash
    };

    try {

        const [results] = await database.query(
            createUserSQL,
            params
        );

        return results.insertId;

    }
    catch (err) {

        console.log("Error creating user");
        console.log(err);

        return false;
    }
}



async function getUserByUsername(username) {

    const getUserSQL = `
        SELECT
            user_id,
            username,
            email,
            password_hash,
            created_at
        FROM users
        WHERE username = :username;
    `;

    const params = {
        username: username
    };

    try {
        const [rows] = await database.query(
            getUserSQL,
            params
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0];
    }
    catch (err) {
        console.log("Error retrieving user");
        console.log(err);

        return false;
    }
}


async function getUserByEmail(email) {

    const getUserSQL = `
        SELECT
            user_id,
            username,
            email,
            password_hash,
            created_at
        FROM users
        WHERE email = :email;
    `;

    const params = {
        email: email
    };

    try {

        const [rows] = await database.query(
            getUserSQL,
            params
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0];

    }
    catch (err) {

        console.log("Error retrieving user");
        console.log(err);

        return false;
    }
}


module.exports = {
    createUser,
    getUserByUsername,
    getUserByEmail
};