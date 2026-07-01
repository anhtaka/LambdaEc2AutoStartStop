const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function makeJstObj(date) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).formatToParts(date).map(p => [p.type, p.value])
    );
    const dow = new Date(date.getTime() + 9 * 60 * 60 * 1000).getUTCDay();
    const ymd = parts.year + parts.month + parts.day;
    return {
        format(pattern) {
            switch (pattern) {
            case "YYYY-MM-DD":
                return parts.year + "-" + parts.month + "-" + parts.day;
            case "HH:mm":
                return parts.hour + ":" + parts.minute;
            case "dddd":
                return DAYS[dow];
            case "YYYYMMDD":
                return ymd;
            case "YYYY-MM-DD HH:mm dddd Z":
                return parts.year + "-" + parts.month + "-" + parts.day + " " + parts.hour + ":" + parts.minute + " " + DAYS[dow] + " +09:00";
            default:
                throw new Error("Unsupported format: " + pattern);
            }
        },
    };
}

function jstDate(date) {
    return makeJstObj(date);
}

export default jstDate;
