
const secret = '$58468@16031950$';
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const utils = require('../utils/utils');
const schema = require('../schemas/user.schema');
const _schema = new mongoose.Schema(schema);
const log4js = require('log4js');
const logger = log4js.getLogger('Controller');
_schema.add({ _id: { type: "String" } });
_schema.pre('save', utils.getNextId('user'));

const _model = mongoose.model('user', _schema);

log4js.configure({
    appenders: { 'out': { type: 'stdout' },controller: { type: 'file', filename: 'logs/controller.log',maxLogSize:52428800 } },
    categories: { default: { appenders: ['out','controller'], level: 'info' } }
});

function _create(_req, _res) {
    _req.body.password = jwt.sign(_req.body.password, secret);
    _req.body.createdAt = new Date();
    _req.body.lastUpdated = new Date();
    _req.body.deleted = false;
    _model.create(_req.body, function (_err, _data) {
        if (_err) {
            logger.error(_err);
            _res.status(400).json({ code: _err.code, message: _err.message });
        } else {
            _res.status(200).json(_data);
        }
    });
}

function _read(_req, _res) {
    var query = null;
    var skip = 0;
    var count = 10;
    var filter = {};
    if (_req.query.count && (+_req.query.count) > 0) {
        count = +_req.query.count;
    }
    if (_req.query.page && (+_req.query.page) > 0) {
        skip = count * ((+_req.query.page) - 1);
    }
    if (_req.query.filter) {
        try {
            filter = JSON.parse(_req.query.filter, (_key, _value) => {
                if (typeof _value == 'string' && _value.match(/^(\/)*[\w]+(\/)*[a-z]{0,1}/)) {
                    if (_value.charAt(_value.length - 1) != '/') {
                        return new RegExp(_value.replace(/^\/*([\w]+)\/*[a-z]*$/, '$1'), _value.replace(/^.*\/([a-z]+)$/, '$1'));
                    } else {
                        return new RegExp(_value.replace(/^\/*([\w]+)\/*[a-z]*$/, '$1'));
                    }
                }
                return _value;
            });
        } catch (_e) {
            logger.error(_e);
        }
    }
    if (_req.params.id) {
        query = _model.findById(_req.params.id);
    } else {
        query = _model.find(filter);
        query.skip(skip);
        query.limit(count);
    }
    if (_req.query.select) {
        query.select(_req.query.select.split(',').join(' '));
    }
    query.exec(_handler);
    function _handler(_err, _data) {
        if (_err) {
            logger.error(_err);
            _res.status(400).json({ code: _err.code, message: _err.message });
        } else {
            _res.status(200).json(_data);
        }
    }
}

function _update(_req, _res) {
    _req.body.lastUpdated = new Data();
    _model.findOneAndUpdate({ _id: _req.params.id }, _req.body, function (_err, _data) {
        if (_err) {
            logger.error(_err);
            _res.status(400).json({ code: _err.code, message: _err.message });
        } else {
            _res.status(200).json(_data);
        }
    });
}

function _delete(_req, _res) {
    _model.findByIdAndRemove(_req.params.id, function (_err, _data) {
        if (_err) {
            logger.error(_err);
            _res.status(400).json({ code: _err.code, message: _err.message });
        } else {
            _res.status(200).json(_data);
        }
    });
}

function _count(_req, _res) {
    var filter = {};
    if (_req.query.filter) {
        filter = _req.query.filter;
    }
    _model.count(filter, function (_err, _count) {
        if (_err) {
            logger.error(_err);
            _res.status(400).json({ code: _err.code, message: _err.message });
        } else {
            _res.status(200).end(_count);
        }
    });
}

function _login(_req, _res) {

    var email = _req.body.username;
    var password = _req.body.password;
    if (!email || !email.trim() || !password || !password.trim()) {
        _res.status(400).json({ message: 'Invalid Email ID or Password' });
        return;
    }
    _model.findOne({ email: email }, (_err, _data) => {
        if (_err || !_data) {
            if(_err) logger.error(_err);
            _res.status(400).json({ message: 'Invalid Email ID or Password' });
        } else {
            if(_data.deleted){
                _res.status(401).json({ message: 'Your account was deleted, please contact support@partymuktbharat.org' });
                return;
            }
            jwt.verify(_data.password, secret, (err, decoded) => {
                if (err) {
                    logger.error(_err);
                    _res.status(400).json({ message: 'Invalid Email ID or Password' });
                    return;
                }
                if (decoded != password) {
                    _res.status(400).json({ message: 'Invalid Email ID or Password' });
                    return;
                } else {
                    var temp = {
                        firstName: _data.firstName,
                        lastName: _data.lastName,
                        contact: _data.contact,
                        email: _data.email
                    };
                    temp.token = jwt.sign(temp, secret, { expiresIn: '6h' });
                    _res.status(200).json(temp);
                }
            });
        }
    });
}
function _register(_req, _res) {
    if (!_req.body.email || !_req.body.email.trim() || !_req.body.password || !_req.body.password.trim()) {
        _res.status(400).json({ message: 'Email and password is mandatory' });
        return;
    }
    _req.body.password = jwt.sign(_req.body.password, secret);
    _req.body.createdAt = new Date();
    _req.body.lastUpdated = new Date();
    _req.body.status = 0;
    _req.body.type = 0;
    _req.body.deleted = false;
    _model.create(_req.body, function (_err, _data) {
        if (_err) {
            if(_err.code == 11000){
                _res.status(400).json({ message:'User already registered with this email ID'});
            }else{
                logger.error(_err);
                _res.status(400).json({ message: 'Unable to register please try again later' });
            }
            
        } else {
            _res.status(200).json({ message: 'Account created successfully, please login to continue.' });
        }
    });
}

function _validate(_req, _res){
    if(!_req.headers.authorization){
        _res.status(400).json({ message: 'Invalid Request' });
        return;
    }
    jwt.verify(_req.headers.authorization, secret, (err, decoded) => {
        if (err || !decoded) {
            _res.status(404).json({ message: 'Invalid token' });
            return;
        }
        _model.findOne({ email: decoded.email }, (_err, _data) => {
            if(_err || !_data){
                _res.status(404).json({ message: 'Invalid token' });
                return;
            }
            _res.status(200).json({message:'Valid token'});
        });
    });
}
function _activate(_req, _res){
    
}
function _forgot(_req, _res){
    
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
    forgot: _forgot
}
