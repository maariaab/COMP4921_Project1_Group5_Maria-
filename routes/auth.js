const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();

const {
    createUser,
    getUserByUsername,
    getUserByEmail
} = include("database/users");

const {
    validatePassword
} = include("utils/validation");

const {
    requireLogin
} = include("middleware/auth");


// =========================================================
// SIGNUP
// =========================================================

router.get("/signup", (req, res) => {

    res.render("signup", {
        error: null
    });

});


router.post("/signup", async (req, res) => {

    try {

        const {
            username,
            email,
            password,
            confirmPassword
        } = req.body;


        // Check required fields
        if (
            !username ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            return res.status(400).render("signup", {
                error: "All fields are required."
            });

        }


        // Check passwords match
        if (password !== confirmPassword) {

            return res.status(400).render("signup", {
                error: "Passwords do not match."
            });

        }


        // Check password requirements
        if (!validatePassword(password)) {

            return res.status(400).render("signup", {
                error:
                    "Password must be at least 10 characters " +
                    "and contain an uppercase letter, lowercase " +
                    "letter, number, and symbol."
            });

        }


        // Check username
        const existingUsername =
            await getUserByUsername(username);


        if (existingUsername) {

            return res.status(400).render("signup", {
                error: "That username is already taken."
            });

        }


        // Check email
        const existingEmail =
            await getUserByEmail(email);


        if (existingEmail) {

            return res.status(400).render("signup", {
                error: "An account already uses that email."
            });

        }


        // Hash password
        const passwordHash =
            await bcrypt.hash(password, 12);


        // Create user
        const userId = await createUser({
            username,
            email,
            passwordHash
        });


        if (!userId) {

            return res.status(500).render("signup", {
                error: "Unable to create account."
            });

        }


        // Create authenticated session
        req.session.regenerate((err) => {

            if (err) {

                console.error(
                    "Session regeneration error:",
                    err
                );

                return res.status(500).render("signup", {
                    error: "Unable to create session."
                });

            }


            req.session.userId = userId;


            req.session.save((err) => {

                if (err) {

                    console.error(
                        "Session save error:",
                        err
                    );

                    return res.status(500).render("signup", {
                        error: "Unable to save session."
                    });

                }


                res.redirect("/content/create");

            });

        });

    }
    catch (err) {

        console.error("Signup error:", err);

        res.status(500).render("signup", {
            error: "An unexpected error occurred."
        });

    }

});


// =========================================================
// LOGIN
// =========================================================

router.get("/login", (req, res) => {

    res.render("login", {
        error: null
    });

});


router.post("/login", async (req, res) => {

    try {

        const { username, password } = req.body;



        if (!username || !password) {

            return res.status(400).render("login", {
                error:
                    "Username and password are required."
            });

        }


        const user =
            await getUserByUsername(username);


        if (!user) {

            return res.status(401).render("login", {
                error: "Invalid username or password."
            });

        }


        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!passwordMatches) {

            return res.status(401).render("login", {
                error: "Invalid username or password."
            });

        }


        // Successful login
        req.session.regenerate((err) => {

            if (err) {

                console.error(
                    "Session regeneration error:",
                    err
                );

                return res.status(500).render("login", {
                    error: "Unable to create session."
                });

            }


            req.session.userId =
                user.user_id;


            req.session.save((err) => {

                if (err) {

                    console.error(
                        "Session save error:",
                        err
                    );

                    return res.status(500).render("login", {
                        error: "Unable to save session."
                    });

                }


                res.redirect("/content/create");

            });

        });

    }
    catch (err) {

        console.error("Login error:", err);

        res.status(500).render("login", {
            error: "An unexpected error occurred."
        });

    }

});


// =========================================================
// LOGOUT
// =========================================================

router.post(
    "/logout",
    requireLogin,
    (req, res) => {

        req.session.destroy((err) => {

            if (err) {

                console.error("Logout error:", err);

                return res.status(500).send(
                    "Unable to log out."
                );

            }


            res.clearCookie("connect.sid");

            res.redirect("/");

        });

    }
);


module.exports = router;