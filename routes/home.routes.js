const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.getHome);

router.get('/dmca', homeController.getDMCA);

router.get('/contact', homeController.getContact);

module.exports = router;