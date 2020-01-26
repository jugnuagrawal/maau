const express = require('express');
const bodyParser = require('body-parser');
const log4js = require('log4js');
const mongoose = require('mongoose');

const logger = log4js.getLogger('server');
const app = express();

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const controllers = require('./controllers');

const PORT = process.env.PORT || 3000;
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/maau';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const tokenModel = mongoose.model('tokens');

log4js.configure({
    appenders: { 'out': { type: 'stdout' }, file: { type: 'multiFile', base: 'logs/', property: 'categoryName', extension: '.log', maxLogSize: 10485760, backups: 3, compress: true } },
    categories: { default: { appenders: ['out', 'file'], level: LOG_LEVEL } }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use((req, res, next) => {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    logger.info(req.method, ip, req.path);
    next();
});

mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err) => {
    if (err) {
        logger.error(err);
        throw err;
    }
});

app.use((req, res, next) => {
    if (req.path.indexOf('/auth') == -1) {
        if (req.headers.authorization) {
            tokenModel.findById(req.headers.authorization).then(data => {
                if (!data) {
                    return res.status(401).json({ message: 'Unauthorised' });
                } else {
                    req.user = data.data;
                }
            }).catch(err => {
                logger.error(err);
                res.status(401).json({ message: err.message });
            });
        } else {
            res.status(401).json({ message: 'Unauthorised' });
        }
    } else {
        next();
    }
});

app.use('/api', controllers);

app.use('*', (req, res) => {
    res.status(404).json({ message: 'It seems that you looking for something at the wrong place.' });
});

app.listen(PORT, () => {
    logger.info('Server is listening on port', PORT);
});