const express = require("express");

const router = express.Router();

const {
    requireLogin
} = include("middleware/auth");


router.get(
    "/",
    requireLogin,
    (req, res) => {

        res.render("dashboard");

    }
);


module.exports = router;