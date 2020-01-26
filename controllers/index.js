const router = require('express').Router();

router.use('/auth',require('./auth.controller'));
router.use('/user',require('./user.controller'));

module.exports = router;