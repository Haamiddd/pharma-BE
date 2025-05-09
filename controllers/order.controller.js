const { ObjectId } = require("mongodb");
const Order = require("../models/order.js");
const bcrypt = require("bcrypt");
const { default: mongoose } = require("mongoose");

// Create a new order
exports.addOrder = async (req, res) => {
  try {
    const {
      userId,
      products,
      noOfItems,
      totalPrice,
      contactNumber,
      patientAddress,
      paymentMethod,
    } = req.body;

    const newOrder = new Order({
      userId,
      products,
      noOfItems,
      totalPrice,
      contactNumber,
      patientAddress,
      orderDate: new Date().toLocaleString("en-US", {
        timeZone: "Asia/Colombo",
      }),
      paymentMethod,
    });

    const savedOrder = await newOrder.save();

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get orders based on pharmacyId, sorted by the latest orderDate first
exports.getOrdersByPharmacyId = async (req, res) => {
  try {
    const { pharmacyId } = req.params;

    // Find orders where at least one product has the specified pharmacyId
    const orders = await Order.find({ "products.pharmacyId": pharmacyId })
      .sort({ orderDate: -1 }); // Sort by orderDate in descending order (latest first)

    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update order by _id
exports.updateOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const updateData = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete order by _id
exports.deleteOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get order count by pharmacyId
exports.getOrderCountByPharmacyId = async (req, res) => {
  try {
    const { pharmacyId } = req.params;

    const orderCount = await Order.countDocuments({
      "products.pharmacyId": pharmacyId,
    });

    res.status(200).json({ count: orderCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get orders based on userId, sorted by the latest orderDate first
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find orders where userId matches
    const orders = await Order.find({ userId })
      .sort({ orderDate: -1 }); // Sort by orderDate in descending order (latest first)

    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get total sales with orderStatus equal to "Dispatched"
exports.getTotalSalesDispatched = async (req, res) => {
  try {
    const totalSalesDispatched = await Order.aggregate([
      {
        $match: { orderStatus: "Dispatched" }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalPrice' }
        }
      }
    ]);

    if (totalSalesDispatched.length === 0) {
      return res.status(404).json({ message: 'No sales data found for orders with status "Dispatched".' });
    }

    res.status(200).json({ totalSales: totalSalesDispatched[0].totalSales });
  } catch (error) {
    console.error('Error fetching total sales for orders with status "Dispatched":', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.getTotalSalesDispatchedByDayForPharmacy = async (req, res) => {
  try {
    const pharmacyId = new mongoose.Types.ObjectId(req.params.pharmacyId);

    const totalSalesDispatchedByDay = await Order.aggregate([
      {
        '$match': {
          'orderStatus': 'Dispatched', 
          'products.pharmacyId': pharmacyId
        }
      }, {
        '$addFields': {
          'orderDate': {
            '$dateFromString': {
              'dateString': '$orderDate'
            }
          }
        }
      }, {
        '$group': {
          '_id': {
            'year': {
              '$year': '$orderDate'
            }, 
            'month': {
              '$month': '$orderDate'
            }, 
            'day': {
              '$dayOfMonth': '$orderDate'
            }
          }, 
          'totalSales': {
            '$sum': '$totalPrice'
          }, 
          'totalOrders': {
            '$sum': 1
          }
        }
      }, {
        '$sort': {
          '_id.year': 1, 
          '_id.month': 1, 
          '_id.day': 1
        }
      }
    ]);

    if (totalSalesDispatchedByDay.length === 0) {
      return res.status(404).json({ message: 'No sales data found for orders with status "Dispatched" for this pharmacy.' });
    }

    res.status(200).json(totalSalesDispatchedByDay);
  } catch (error) {
    console.error('Error fetching total sales for orders with status "Dispatched" by day for pharmacy:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};