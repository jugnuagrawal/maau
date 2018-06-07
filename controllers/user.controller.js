const magicToken = require('magic-token');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const log4js = require('log4js');
const config = require('../config');
const utils = require('../utils/utils');
const userSchema = new mongoose.Schema(require('../schemas/user.schema'));
const tokenSchema = new mongoose.Schema({ _id: String, userId: String, data: String });
const messages = require('../messages/user.messages');
const logger = log4js.getLogger('Controller');
userSchema.add({ _id: { type: "String" } });
userSchema.pre('save', utils.getNextId('user'));

const userModel = mongoose.model('user', userSchema);
const tokenModel = mongoose.model('token', tokenSchema);

const secret = config.secret;

log4js.configure({
    appenders: { 'out': { type: 'stdout' }, controller: { type: 'file', filename: 'logs/controller.log', maxLogSize: 52428800 } },
    categories: { default: { appenders: ['out', 'controller'], level: 'info' } }
});

function sendMail(to, subject, content) {
    let transporter = nodemailer.createTransport(config.smtp);
    let mailOptions = {
        from: config.mail.from, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: content // html body
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            logger.error(err);
            return;
        }
        logger.info('Email sent: ', info.messageId);
    });
}

function _create(req, res) {
    req.body.password = utils.encrypt(secret, req.body.password);
    req.body.createdAt = new Date();
    req.body.lastUpdated = new Date();
    req.body.deleted = false;
    userModel.create(req.body, (err, data) => {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: messages.post.user['500'] });
        } else {
            if (config.enableMail) {
                var token = magicToken.token();
                tokenModel.create({ _id: token, userId: data._id });
                sendMail(req.body.email, 'Activate your Account', '<h1>Welcome to Muneem</h1><br><p>Hi,</p><p>Please click the below link to active your account</p><br><a href="http://localhost:3000/activate/' + token + '">Activate Account</a><br><p>Thankyou</p>');
            }
            res.status(200).json(data);
        }
    });
}

function _read(req, res) {
    var query = null;
    var skip = 0;
    var count = 10;
    var filter = {};
    if (req.query.count && req.query.count > 0) {
        count = req.query.count;
    }
    if (req.query.count < 0) {
        count = -1;
    }
    if (count > 0 && req.query.page && (+req.query.page) > 0) {
        skip = count * ((+req.query.page) - 1);
    }
    if (req.query.filter) {
        try {
            filter = JSON.parse(req.query.filter, (key, value) => {
                if (typeof value == 'string' && value.match(/^(\/)*[\w]+(\/)*[a-z]{0,1}/)) {
                    if (value.charAt(value.length - 1) != '/') {
                        return new RegExp(value.replace(/^\/*([\w]+)\/*[a-z]*$/, '$1'), value.replace(/^.*\/([a-z]+)$/, '$1'));
                    } else {
                        return new RegExp(value.replace(/^\/*([\w]+)\/*[a-z]*$/, '$1'));
                    }
                }
                return value;
            });
        } catch (e) {
            logger.error(e);
        }
    }
    if (config.permanentDelete == false) {
        filter.deleted = false;
    }
    if (req.params.id) {
        query = userModel.findById(req.params.id);
    } else {
        query = userModel.find(filter);
        if (count > 0) {
            query.skip(skip);
            query.limit(count);
        }
    }
    if (req.query.select) {
        query.select(req.query.select.split(',').join(' '));
    }
    query.exec((err, data) => {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: messages.get.user['500'] });
        } else {
            res.status(200).json(data);
        }
    });
}

function _update(req, res) {
    req.body.lastUpdated = new Data();
    if (req.body.password) {
        req.body.password = utils.encrypt(secret, req.body.password);
    }
    userModel.findOneAndUpdate({ id: req.params.id }, req.body, (err, data) => {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: messages.put.user['500'] });
        } else {
            res.status(200).json(data);
        }
    });
}

function _delete(req, res) {
    if (config.permanentDelete == true) {
        userModel.findByIdAndRemove(req.params.id, (err, data) => {
            if (err) {
                logger.error(err);
                res.status(500).json({ message: messages.delete.user['500'] });
            } else {
                res.status(200).json(data);
            }
        });
    } else {
        userModel.findOneAndUpdate({ id: req.params.id }, { deleted: true }, (err, data) => {
            if (err) {
                logger.error(err);
                res.status(400).json({ message: messages.delete.user['500'] });
            } else {
                res.status(200).json(data);
            }
        });
    }
}

function _count(req, res) {
    var filter = {};
    if (req.query.filter) {
        filter = req.query.filter;
    }
    if (config.permanentDelete == false) {
        filter.deleted = false;
    }
    userModel.count(filter, (err, count) => {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: messages.get.count['500'] });
        } else {
            res.status(200).end(count);
        }
    });
}

function _login(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    if (!email || !email.trim() || !password || !password.trim()) {
        res.status(400).json({ message: messages.post.login['400'] });
        return;
    }
    userModel.findOne({ email: email }, (err, data) => {
        if (err) {
            logger.error(err);
            res.status(500).json({ message: messages.post.login['500'] });
            return;
        }
        if (!data) {
            res.status(400).json({ message: messages.post.login['400'] });
            return;
        }
        if (data.deleted) {
            res.status(401).json({ message: messages.post.login['401'] });
            return;
        }
        var decrypted = utils.decrypt(secret, data.password);
        if (decrypted != password) {
            res.status(400).json({ message: messages.post.login['400'] });
            return;
        } else {
            var temp = {
                firstName: data.firstName,
                lastName: data.lastName,
                contact: data.contact,
                email: data.email
            };
            temp.token = jwt.sign(temp, secret, { expiresIn: '6h' });
            res.status(200).json(temp);
        }
    });
}
function _register(req, res) {
    if (!req.body.email || !req.body.email.trim() || !req.body.password || !req.body.password.trim()) {
        res.status(400).json({ message: messages.post.register['400'] });
        return;
    }
    req.body.password = utils.encrypt(secret, req.body.password);
    req.body.createdAt = new Date();
    req.body.lastUpdated = new Date();
    req.body.status = 0;
    req.body.type = 0;
    req.body.deleted = false;
    userModel.create(req.body, (err, data) => {
        if (err) {
            if (err.code == 11000) {
                res.status(401).json({ message: messages.post.register['401'] });
            } else {
                logger.error(err);
                res.status(500).json({ message: messages.post.register['500'] });
            }
        } else {
            if (config.enableMail) {
                var token = magicToken.token();
                tokenModel.create({ _id: token, userId: data._id });
                sendMail(req.body.email, 'Activate your Account', '<h1>Welcome to Muneem</h1><br><p>Hi,</p><p>Please click the below link to active your account</p><br><a href="http://localhost:3000/activate/' + token + '">Activate Account</a><br><p>Thankyou</p>');
            }
            res.status(200).json({ message: messages.post.register['200'] });
        }
    });
}

function _validate(req, res) {
    jwt.verify(req.headers.authorization, secret, (err, decoded) => {
        if (err || !decoded) {
            res.status(401).json({ message: messages.get.validate['401'] });
            return;
        }
        userModel.findOne({ email: decoded.email }, (err, data) => {
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
    });
}
function _activate(req, res) {
    tokenModel.findById(req.params.token, (tokenErr, tokenData) => {
        if (tokenErr || !tokenData) {
            res.render('activate', {
                status:401,
                message: messages.get.activate['401']
            });
            return;
        }
        userModel.findByIdAndUpdate(tokenData.userId, { status: 1 }, (err, data) => {
            if (err) {
                logger.error(err);
                res.render('activate', {
                    status:500,
                    message: messages.get.activate['500']
                });
                return;
            }
            if (!data) {
                res.render('activate', {
                    status:401,
                    message: messages.get.activate['401']
                });
                return;
            }
            res.render('activate', {
                status:200,
                message: messages.get.activate['200']
            });
        });
        tokenModel.deleteOne({ _id: req.params.token }).exec();
    });
}
function _forgot(req, res) {
    if (!req.body || !req.body.email) {
        res.status(400).json({ message: messages.post.forgot['400'] });
        return;
    }
    userModel.findOne({ email: req.body.email }, (err, data) => {
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
            var token = magicToken.token();
            var code = utils.generateCode();
            tokenModel.create({ _id: token, userId: data._id, data: code });
            sendMail(data.email, 'Reset your password', '<p>Hi,</p><p>Below is the code you need to reset your password.</p><h3><strong>' + code + '</strong></h3><p>Thankyou</p>');
        }
        res.status(200).json({ message: messages.post.forgot['200'], token: token });
    });
}
function _reset(req, res) {
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
        var password = utils.encrypt(secret, req.body.password);
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
}


//Exporting CRUD controllers
module.exports = {
    create: _create,
    read: _read,
    update: _update,
    delete: _delete,
    count: _count,
    login: _login,
    register: _register,
    validate: _validate,
    activate: _activate,
    forgot: _forgot,
    reset: _reset
}
