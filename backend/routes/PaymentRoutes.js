import express from "express";
import midtransClient from "midtrans-client";
import Order from "../models/Order.js";
import Item from "../models/Item.js";
const router = express.Router();

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: "Mid-server-DBPNAdBY62uOiUXvrVnr4RzK",
});

// POST /api/payment/create-transaction
router.post("/create-transaction", async (req, res) => {
  try {
    const { orderId, amount, customer } = req.body;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: customer.name,
        email: customer.email,
      },

    callbacks: {
        finish: "http://localhost:3000/profile",
        error: "http://localhost:3000/payment-failed",
        pending: "http://localhost:3000/payment-pending",
    },
    };

    const transaction = await snap.createTransaction(parameter);

    res.json({
      token: transaction.token,
    });
  } catch (error) {
    console.error("Midtrans Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const restoreStock = async (orderId) => {
  const order = await Order.findById(orderId)
  .populate({ path: "UserId", select: "Name Email" })
      .populate({ 
        path: "AddressId", 
        populate: ["ProvinceId", "CityId", "DistrictId"] 
      })
      .populate("DeliveryId")
      .populate({
        path: "ProductId",
        populate: {
          path: "ProductDetail",
          populate: { path: "ItemId", model: "Item" }
        }
      })
      .populate("AdministrationFee");

  const items = order.ProductId.ProductDetail;

  for (const item of items) {
    await Item.updateOne(
      { _id: item.ItemId._id },
      { $inc: { stok: item.Quantity } } // atau sesuai quantity
    );
  }

  console.log("✅ Stok dikembalikan");
};

router.post("/api/payment/notification", async (req, res) => {
  try {
    const data = req.body;

    const orderId = data.order_id;
    const status = data.transaction_status;

    console.log("📩 Midtrans webhook:", status);

    if (status === "settlement") {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/${orderId}/status-pembayaran`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ StatusPembayaran: 1 }),
        }
      );
    } 
    
    else if (status === "expire") {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/${orderId}/status-pembayaran`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ StatusPembayaran: 2 }),
        }
      );

      // 🔥 BALIKKAN STOK
      await restoreStock(orderId);
    } 
    
    else if (status === "cancel") {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/${orderId}/status-pembayaran`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ StatusPembayaran: 2 }),
        }
      );

      // 🔥 BALIKKAN STOK
      await restoreStock(orderId);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
});


export default router;