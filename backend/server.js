import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// === 1. Import Routes Utama (Sesuai Contoh Anda) ===
import userRoutes from "./routes/UserRoutes.js";
import orderRoutes from "./routes/OrderRoutes.js";
import productRoutes from "./routes/ProductRoutes.js";
import addressRoutes from "./routes/AddressRoutes.js";
import ratingRoutes from "./routes/RatingRoutes.js";
// Catatan: Saya asumsikan design3DRoutes adalah untuk model 3DModel/3DModelRoutes.js
import design3DRoutes from "./routes/3dModelRoutes.js"; // Menggunakan nama yang Anda berikan (design3DRoutes)

// === 2. Import Routes Detail dan Geografis (Tambahan) ===
import itemRoutes from "./routes/ItemRoutes.js";
import componentRoutes from "./routes/ComponentRoutes.js";
import deliveryRoutes from "./routes/DeliveryRoutes.js";
import discountRoutes from "./routes/DiscountRoutes.js";
import administrationFeeRoutes from "./routes/AdministrationFeeRoutes.js";
import provinceRoutes from "./routes/ProvinceRoutes.js";
import cityRoutes from "./routes/CityRoutes.js";
import districtRoutes from "./routes/DistrictRoutes.js";
import postalCodeRoutes from "./routes/PostalCodeRoutes.js";
import shopRoutes from "./routes/ShopRoutes.js"; // Import ShopRoutes
import paymentRoutes from "./routes/PaymentRoutes.js"; // Import PaymentRoutes
import productDetailsRoutes from "./routes/ProductDetailRoutes.js"

// Load environment variables
dotenv.config();  

const app = express();
const PORT = process.env.PORT || 5000;

// === Konfigurasi path untuk folder publik ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const cors = require("cors");

// === Middleware ===
// app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" })); // Izinkan frontend React (menggunakan env atau fallback)
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://blb-prod.vercel.app"
].filter(Boolean); // Menghapus nilai null/undefined agar tidak error

app.use(cors({
  origin: function (origin, callback) {
    // Izinkan jika origin ada di daftar atau jika request tidak punya origin (seperti Postman/Server-to-server)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Loaded" : "❌ Missing");
console.log("CLIENT_URL:", process.env.CLIENT_URL);

// === Folder publik untuk file model (GLB, dsb) ===
// Ini akan melayani file statis di URL: http://localhost:5000/models/namafile.glb
app.use("/models", express.static(path.join(__dirname, "public", "models")));
app.use("/images", express.static(path.join(__dirname, "uploads")));

// --- PENTING: Struktur database ini membutuhkan folder 'public/models' ---
// 

// === Routes ===
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/design3d", design3DRoutes);
app.use('/api/ratings', ratingRoutes);

// Routes Detail dan Geografis
app.use("/api/items", itemRoutes);
app.use("/api/components", componentRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/adminfees", administrationFeeRoutes);
app.use("/api/provinces", provinceRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/districts", districtRoutes);
app.use("/api/postalcodes", postalCodeRoutes);
app.use("/api/shops", shopRoutes); // Tambahkan route untuk Shop
app.use("/api/payment", paymentRoutes);
app.use("/api/productdetails", productDetailsRoutes);
app.use(express.static('public'));

// === Tes koneksi backend ===
  app.get("/", (req, res) => {
  res.send("✅ Backend florist-3d API is running!");
});

// === Koneksi ke MongoDB ===
mongoose
  .connect(process.env.MONGO_URI, {
    // Opsi ini tidak diperlukan di Mongoose terbaru, namun dipertahankan untuk kompatibilitas/gaya coding.
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// === Jalankan server ===
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));