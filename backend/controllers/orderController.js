const Order = require('../models/Order');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (customer)
const createOrder = async (req, res) => {
    try {
        console.log('--- CREATE ORDER ---');
        console.log('User:', req.user._id, req.user.email, req.user.role);
        console.log('Body:', JSON.stringify(req.body));

        const { items, totalAmount } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ message: 'Invalid total amount' });
        }

        const order = new Order({
            customerId: req.user._id,
            items,
            totalAmount,
            status: 'pending',
        });

        const createdOrder = await order.save();
        console.log('Order saved to MongoDB:', createdOrder._id);

        // Populate customer info for the response
        const populated = await Order.findById(createdOrder._id)
            .populate('customerId', 'name email');

        const formatted = formatOrder(populated);

        // Emit socket event so office receives it in real-time
        const io = req.app.get('io');
        if (io) {
            io.emit('newOrder', formatted);
            console.log('Socket event emitted: newOrder');
        }

        res.status(201).json(formatted);
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Get pending orders (for office)
// @route   GET /api/orders/pending
// @access  Private (office)
const getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'pending' })
            .populate('customerId', 'name email')
            .sort({ createdAt: -1 });

        res.json(orders.map(formatOrder));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Get all orders (for office dashboard)
// @route   GET /api/orders/all
// @access  Private (office)
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('customerId', 'name email')
            .populate('officeId', 'name email')
            .sort({ createdAt: -1 });

        res.json(orders.map(formatOrder));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Get logged-in customer's orders
// @route   GET /api/orders/my-orders
// @access  Private (customer)
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.user._id })
            .populate('customerId', 'name email')
            .sort({ createdAt: -1 });

        res.json(orders.map(formatOrder));
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (office)
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'rejected', 'completed'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = status;
        order.officeId = req.user._id;
        const updatedOrder = await order.save();

        const populated = await Order.findById(updatedOrder._id)
            .populate('customerId', 'name email')
            .populate('officeId', 'name email');

        const formatted = formatOrder(populated);

        // Emit socket event so customer gets live update
        const io = req.app.get('io');
        if (io) {
            io.emit('orderUpdated', formatted);
        }

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// Helper: format order for API response
function formatOrder(order) {
    return {
        id: order._id.toString(),
        customerId: order.customerId?._id?.toString() || order.customerId?.toString(),
        customerName: order.customerId?.name || 'Unknown',
        customerEmail: order.customerId?.email || 'Unknown',
        officeId: order.officeId?._id?.toString() || order.officeId?.toString() || null,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
    };
}

module.exports = { createOrder, getPendingOrders, getAllOrders, getMyOrders, updateOrderStatus };
