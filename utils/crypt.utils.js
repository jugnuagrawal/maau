const crypto = require('crypto');

function encrypt(secret, text) {
    var cipher = crypto.createCipher('aes-256-cbc-hmac-sha256', secret)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(secret, text) {
    var decipher = crypto.createDecipher('aes-256-cbc-hmac-sha256', secret)
    var dec = decipher.update(text, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
}

function generateCode(length = 5) {
    var chars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    var str = '';
    for (var i = 0; i < length; i++) {
        var index = Math.floor(Math.random() * 12345) % chars.length;
        str += chars[index];
    }
    return str;
}

module.exports = {
    encrypt: encrypt,
    decrypt: decrypt
};