const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const gameDetailController = require('../controllers/gameDetailController');

router.get('/:id', gameDetailController.getGameDetails);

module.exports = router;