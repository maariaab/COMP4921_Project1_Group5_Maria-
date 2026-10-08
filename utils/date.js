function formatMonthDay(date) {

    if (!date) {
        return "—";
    }

    const value =
        new Date(date);

    const month =
        String(value.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(value.getDate())
            .padStart(2, "0");

    return `${month}-${day}`;
}


module.exports = {
    formatMonthDay
};