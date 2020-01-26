const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const model = mongoose.model('users');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'maau';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'maau';

function createAdminUser() {
    async function execute() {
        let user = await model.findById('ADMIN');
        if (!user) {
            user = {};
            user._id = 'ADMIN';
            user.name = 'Admin';
            user.username = ADMIN_USERNAME;
            user.password = bcrypt.hashSync(ADMIN_PASSWORD, 10);
            user.status = 'ACTIVE';
            user.level = 'ADMIN';
            const doc = new model(user);
            const res = await doc.save();
            if (res) {
                return {
                    message: 'Admin User Created!'
                };
            }
        } else {
            return {
                message: 'Admin User Exist!'
            };
        }
    }
    return execute();
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
    generateCode,
    createAdminUser
};