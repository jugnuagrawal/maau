const mongoose = require("mongoose");
const crypto = require('crypto');
function createId(next, size) {
    var char = this.charAt(0).toUpperCase();
    for (var i = 1; i < this.length; i++) {
        if (this.charAt(i) == this.charAt(i).toUpperCase()) {
            char += this.charAt(i);
        }
    }
    var len = (next + '').length;
    var padding = '';
    for (var i = 0; i < (size - len); i++) {
        padding += '0';
    }
    return char + padding + next;
}

String.prototype.createId = createId;

var counterSchema = new mongoose.Schema({
    _id: {
        type: String
    },
    next: {
        type: Number
    }
});
var counterModel = mongoose.model("counter", counterSchema);
function creatCounter(collectionName) {
    counterModel.create({
        _id: collectionName,
        next: 1
    }).then(() => { }, () => { });
};

function getNext(collectionName, callback) {
    var options = {};
    options.new = true;
    options.upsert = true;
    options.setDefaultsOnInsert = true;
    counterModel.findByIdAndUpdate(collectionName, {
        $inc: {
            next: 1
        }
    }, options, callback);
};


function getNextId(collectionName) {
    creatCounter(collectionName)
    return function (next) {
        var self = this;
        if (!self._id) {
            getNext(collectionName, function (_err, _doc) {
                self._id = collectionName.createId(_doc.next, 10);
                next();
            });
        } else {
            next();
        }
    };
}

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

function isDefaultPath(path) {
    const defaultPath = ['activate', 'apidoc', 'login', 'register', 'forgot', 'validate'];
    if (path && path.trim()) {
        return path.split('/').find(e => defaultPath.indexOf(e) > -1);
    }
    return false;
}

module.exports = {
    getNextId: getNextId,
    encrypt: encrypt,
    decrypt: decrypt,
    generateCode: generateCode,
    isDefaultPath: isDefaultPath
};