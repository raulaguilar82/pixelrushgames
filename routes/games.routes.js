const express = require('express');
const router = express.Router();
const gameDetailController = require('../controllers/gameDetailController');

router.get('/:slug', gameDetailController.getGameBySlug);

module.exports = router;
