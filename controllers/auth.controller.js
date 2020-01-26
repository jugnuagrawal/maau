const router = require('express').Router();
const uniqueToken = require('unique-token');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const log4js = require('log4js');

const mongooseUtils = require('../utils/mongoose.utils');
const userSchema = new mongoose.Schema(require('../schemas/user.schema'));
const tokenSchema = new mongoose.Schema(mongooseUtils.tokenSchema);
const messages = require('../messages/user.messages');
const logger = log4js.getLogger('auth.controller');

let TOKEN_TTL = process.env.TOKEN_TTL || 7200;

if (TOKEN_TTL && typeof TOKEN_TTL === 'string') {
    TOKEN_TTL = parseInt(TOKEN_TTL, 10);
}

userSchema.plugin(mongooseUtils.userSchemaPlugin);

const userModel = mongoose.model('users', userSchema);
const tokenModel = mongoose.model('tokens', tokenSchema);

async function createOrUpdateIndex() {
    const status = await tokenModel.create({ _id: 'temp' });
    let flag = await tokenModel.collection.indexExists('expiresIn_1');
    if (flag) {
        flag = await tokenModel.collection.dropIndex('expiresIn_1');
        logger.debug('Index Dropped!', flag);
    }
    flag = await tokenModel.collection.createIndex({ expiresIn: 1 }, { expireAfterSeconds: TOKEN_TTL });
    logger.debug('Index Created', flag);
}
createOrUpdateIndex().catch(err => {
    logger.error(err);
});


const commonUtils = require('../utils/common.utils');

commonUtils.createAdminUser().then(data => {
    logger.info(data.message);
}).catch(err => {
    logger.error(err);
});

const SECRET = process.env.SECRET;

router.post('/login', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    if (!username || !username.trim() || !password || !password.trim()) {
        res.status(400).json({ message: messages.post.login['400'] });
        return;
    }
    userModel.findOne({ username }).exec().then(user => {
        if (!user) {
            res.status(400).json({ message: messages.post.login['400'] });
            return;
        }
        if (!bcrypt.compareSync(password, user.password)) {
            res.status(400).json({ message: messages.post.login['400'] });
            return;
        } else {
            var temp = {
                name: user.name,
                contact: user.contact,
                username: user.username
            };
            temp.token = uniqueToken.token();
            tokenModel.create({ _id: temp.token, data: user }).then(d => {
                res.status(200).json(temp);
            }).catch(e => {
                res.status(500).json({ message: 'Unable to login' });
            });
        }
    }).catch(err => {
        logger.error(err);
        res.status(500).json({ message: messages.post.login['500'] });
    });
});

router.post('/register', (req, res) => {
    if (!req.body.username || !req.body.username.trim() || !req.body.password || !req.body.password.trim()) {
        res.status(400).json({ message: messages.post.register['400'] });
        return;
    }
    req.body.password = bcrypt.hashSync(req.body.password, 10);
    req.body.status = 'CREATED'
    req.body.level = 'LOCAL';
    const doc = new userModel(req.body);
    doc.save().then(data => {
        res.status(200).json({ message: messages.post.register['200'] });
    }).catch(err => {
        if (err.code == 11000) {
            res.status(401).json({ message: messages.post.register['401'] });
        } else {
            logger.error(err);
            res.status(500).json({ message: messages.post.register['500'] });
        }
    });
});

router.delete('/logout', (req, res) => {
    tokenModel.findByIdAndRemove(req.headers.authorization).then(d => {
        res.status(200).json({ message: messages.get.logout['200'] });
    }).catch(e => {
        res.status(500).json({ message: messages.get.logout['500'] });
    });
});

router.get('/validate', (req, res) => {
    tokenModel.findById(req.headers.authorization).then(d => {
        if (!d) {
            res.status(401).json({ message: messages.get.validate['401'] });
            return;
        }
        userModel.findById(d.userId, (err, data) => {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: messages.get.validate['500'] });
                return;
            }
            if (!data) {
                res.status(401).json({ message: messages.get.validate['401'] });
                return;
            }
            res.status(200).json({ message: messages.get.validate['200'] });
        });
    }).catch(e => {
        res.status(500).json({ message: messages.get.validate['500'] });
    });
});

router.get('/activate/:token', (req, res) => {
    tokenModel.findById(req.params.token, (tokenErr, tokenData) => {
        if (tokenErr || !tokenData) {
            res.render('activate', {
                status: 401,
                message: messages.get.activate['401']
            });
            return;
        }
        userModel.findByIdAndUpdate(tokenData.userId, { status: 1 }, (err, data) => {
            if (err) {
                logger.error(err);
                res.render('activate', {
                    status: 500,
                    message: messages.get.activate['500']
                });
                return;
            }
            if (!data) {
                res.render('activate', {
                    status: 401,
                    message: messages.get.activate['401']
                });
                return;
            }
            res.render('activate', {
                status: 200,
                message: messages.get.activate['200']
            });
        });
        tokenModel.deleteOne({ _id: req.params.token }).exec();
    });
});

router.post('/forgot', (req, res) => {
    if (!req.body || !req.body.username) {
        res.status(400).json({ message: messages.post.forgot['400'] });
        return;
    }
    userModel.findOne({ username: req.body.username }, (err, data) => {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: messages.post.forgot['500'] });
            return
        }
        if (!data) {
            res.status(400).json({ message: messages.post.forgot['400'] });
            return
        }
        if (config.enableMail) {
            var token = uniqueToken.token();
            var code = uniqueToken.random().toUpperCase();
            tokenModel.create({ _id: token, userId: data._id, data: code });
            sendMail(data.username, 'Reset your password', '<p>Hi,</p><p>Below is the code you need to reset your password.</p><h3><strong>' + code + '</strong></h3><p>Thankyou</p>');
        }
        res.status(200).json({ message: messages.post.forgot['200'], token: token });
    });
});

router.post('/reset', (req, res) => {
    if (!req.body || !req.body.password || !req.body.code || !req.body.token) {
        res.status(400).json({ message: messages.post.forgot['400'] });
        return;
    }
    tokenModel.findById(req.body.token, (tokenErr, tokenData) => {
        if (tokenErr) {
            logger.error(tokenErr);
            res.status(500).json({ message: messages.post.forgot['500'] });
            return
        }
        if (!tokenData || (tokenData.data != req.body.code)) {
            res.status(400).json({ message: messages.post.forgot['400'] });
            return
        }
        var password = utils.encrypt(SECRET, req.body.password);
        userModel.findByIdAndUpdate(tokenData.userId, { password: password, lastUpdated: new Date() }, (err, data) => {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: messages.post.forgot['500'] });
                return
            }
            res.status(200).json({ message: messages.post.forgot['200'] });
        });
        tokenModel.deleteOne({ _id: req.body.token }).exec();
    });
});


module.exports = router;