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
    }).then(() => {}, () => {});
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
            getNext(collectionName,function(_err,_doc){
                self._id = collectionName.createId(_doc.next,10);
                next();
            });
        } else {
            next();
        }
    };
}

function encrypt(secret,text){
  var cipher = crypto.createCipher('aes-256-ctr',secret)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(secret,text){
  var decipher = crypto.createDecipher('aes-256-ctr',secret)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}


module.exports.getNextId = getNextId;
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;