function getBadge(points) {
    if (points >= 1500) return 'Grandmaster';
    if (points >= 701) return 'Master';
    if (points >= 301) return 'Gold';
    if (points >= 101) return 'Silver';
    return 'Bronze';
}

module.exports = { getBadge };

function checkSpam(content) {
    const suspiciousPatterns = [
        /bit\.ly/i,
        /tinyurl/i,
        /free.*money/i,
        /click.*here.*now/i,
        /you.*won/i,
        /whatsapp.*\+\d{10,}/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
}

module.exports = { getBadge, checkSpam };