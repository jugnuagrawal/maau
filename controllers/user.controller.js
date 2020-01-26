const router = require('express').Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const log4js = require('log4js');

const logger = log4js.getLogger('user.controller');
const userModel = mongoose.model('users');

router.post('/', (req, res) => {
    async function execute() {
        const payload = req.body;
        let doc = await userModel.findOne({ username: payload.username });
        if (doc) {
            return res.status(400).json({
                message: 'User Already Exist'
            });
        }
        payload.password = bcrypt.hashSync(payload.password, 10);
        doc = new userModel(payload);
        const status = await doc.save();
        res.status(200).json(status);
    }
    execute().catch(err => {
        logger.error(err);
        res.status(500).json({ message: err.message });
    });

});

router.get('/', (req, res) => {
    let query = null;
    let skip = 0;
    let count = 10;
    let filter = {};
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
    if (req.query.countOnly) {
        query = userModel.count(filter);
    } else {
        query = userModel.find(filter);
        if (count > 0) {
            query.skip(skip);
            query.limit(count);
        }
        if (req.query.select) {
            query.select(req.query.select.split(',').join(' '));
        }
    }
    query.exec().then(data => {
        res.status(200).json(data);
    }).catch(err => {
        logger.error(err);
        res.status(500).json({ message: err.message });
    });
});

router.put('/:id', (req, res) => {
    async function execute() {
        const payload = req.body;
        const doc = await userModel.findById(req.params.id);
        if (doc) {
            if (payload.password) {
                doc.password = bcrypt.hashSync(payload.password, 10);
                delete payload.password;
            }
            delete payload._id;
            Object.keys(payload).forEach(key => {
                if (payload[key] && payload[key].trim()) {
                    doc[key] = payload[key];
                }
            });
            const status = await doc.save();
            res.status(200).json(status);
        } else {
            res.status(404).json({
                message: 'User Not Found'
            });
        }
    }
    execute().catch(err => {
        logger.error(err);
        res.status(500).json({ message: err.message });
    });
});

router.delete('/:id', (req, res) => {
    async function execute() {
        const doc = await userModel.findById(req.params.id);
        if (doc) {
            doc.status = 'DELETED';
            const status = await doc.save();
            res.status(200).json(status);
        } else {
            res.status(404).json({
                message: 'User Not Found'
            });
        }
    }
    execute().catch(err => {
        logger.error(err);
        res.status(500).json({ message: err.message });
    });
});

router.get('/:id', (req, res) => {
    userModel.findById(req.params.id).then(doc => {
        res.status(200).json(doc);
    }).catch(err => {
        logger.error(err);
        res.status(500).json({ message: err.message });
    });
});


module.exports = router;