const express = require('express');
const router = express.Router();
const {
    createOrder,
    getPendingOrders,
    getAllOrders,
    getMyOrders,
    updateOrderStatus,
} = require('../controllers/orderController');
const { protect, officeOnly } = require('../middleware/authMiddleware');

// Customer routes
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);

// Office routes
router.get('/pending', protect, officeOnly, getPendingOrders);
router.get('/all', protect, officeOnly, getAllOrders);
router.put('/:id/status', protect, officeOnly, updateOrderStatus);

module.exports = router;
