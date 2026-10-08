function validatePassword(password) {

    if (password.length < 10) {
        return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    return (
        hasUppercase &&
        hasLowercase &&
        hasNumber &&
        hasSymbol
    );
}

module.exports = {
    validatePassword
};