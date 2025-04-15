const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.getHome);

router.get('/dmca', homeController.getDMCA);

router.get('/contact', homeController.getContact);

router.get('/brokenURL', homeController.getBrokenURL);

module.exports = router;