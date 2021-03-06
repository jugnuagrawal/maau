const mongoose = require('mongoose');

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


function userSchemaPlugin(schema) {
    schema.add({
        _id: String,
        createdAt: Date,
        updatedAt: Date,
        namespace: String,
        secret: String,
    });
    schema.pre('save', getNextId('user'));
    schema.pre('save', function () {
        const doc = this;
        if (doc.isNew) {
            doc.createdAt = new Date();
            doc.namespace = uniqueToken.token();
            doc.secret = uniqueToken.token();
        }
        doc.updatedAt = new Date();
    });
}

const tokenSchema = {
    _id: String,
    data: Object,
    expiresIn: {
        type: Date,
        default: Date.now()
    }
};


module.exports = {
    getNextId: getNextId,
    tokenSchema: tokenSchema,
    userSchemaPlugin: userSchemaPlugin
};