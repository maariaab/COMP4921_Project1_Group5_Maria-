const crypto = require("crypto");


function generateContentId(length = 6) {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "abcdefghijklmnopqrstuvwxyz" +
        "0123456789";


    let id = "";


    for (let i = 0; i < length; i++) {

        const randomIndex =
            crypto.randomInt(
                0,
                characters.length
            );

        id += characters[randomIndex];

    }


    return id;
}

function validateContentId(contentId) {

    const pattern =
        /^[A-Za-z0-9_-]{3,12}$/;

    return pattern.test(contentId);
}


module.exports = {
    generateContentId,
    validateContentId
};