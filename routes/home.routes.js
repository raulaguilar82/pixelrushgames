const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

router.get('/', homeController.getHome);

router.get('/dmca', homeController.getDMCA);

router.get('/contact', homeController.getContact);

router.get('/brokenURL', csrfProtection, homeController.getBrokenURL);

router.get('/games', homeController.gamesController.getAllGames);

router.get('/search', homeController.searchGames);

module.exports = router;
