const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.getHome);

router.get('/dmca', homeController.getDMCA);

router.get('/contact', homeController.getContact);

router.get('/brokenURL', homeController.getBrokenURL);

router.get('/games', homeController.gamesController.getAllGames);

router.get('/search', homeController.searchGames);

module.exports = router;