import "./Payment.css";
import { useEffect, useState, useRef, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useLoading } from "../../contexts/LoadingContext";
import { useAlert } from "../../contexts/AlertContext";
import { useNavigate } from "react-router-dom";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { get as getDb } from "idb-keyval";
import { clear } from "idb-keyval";

function MainSection({
  selectedProduct,
  addressData,
  adminFee,
  discountData,
  modelScene,
}) {
  // 1. Fungsi Helper untuk Format Titik (Rp. 10.000)
  const formatRupiah = (number) => {
    if (number === undefined || number === null || isNaN(number))
      return "Rp. 0";
    return "Rp. " + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  console.log("selectedProduct Data:", selectedProduct);
  console.log("addressData Data:", addressData);
  console.log("adminFee Data:", adminFee);
  console.log("discountData Data:", discountData);

  // Konstanta harga tetap
  const shippingFee = 10000;

  // Data Admin Fee
  const adminFeeAmount = adminFee[0]?.Fee || 0;

  // 2. Perhitungan variabel harga (sebelum total)
  const productPrice = selectedProduct?.price || 0;

  // Hitung Diskon
  const discountPercentage = discountData[0]?.Percentage || 0;
  const discountMax = discountData[0]?.Maximum || 0;
  const calculatedDiscount = Math.min(
    Math.floor(discountPercentage * productPrice),
    discountMax
  );

  // 3. Total Harga (Hanya menjumlahkan variabel yang sudah ada)
  const totalOrder =
    productPrice + shippingFee + adminFeeAmount - calculatedDiscount;

  const tempProvince = addressData.ProvinceId;
  const tempCity = addressData.CityId;
  const tempDistrict = addressData.DistrictId;
  const tempPostalCode = addressData.PostalCodeId;
  const tempRecipientNumber = addressData.RecipientNumber;

  const tempQuestion = selectedProduct.question;
  const tempAnswer = selectedProduct.answer;

  const [model, setModel] = useState([]);

  const [currentModelPath, setCurrentModelPath] = useState("");

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const { showLoading, hideLoading } = useLoading();

  const [showPayment, setShowPayment] = useState(false);

  console.log("Current user:", user);
  
  const handleCardSelect = async () => {
    showLoading("Memproses pembayaran...");
    if (!user) {
      showAlert("Silakan login terlebih dahulu untuk melakukan pembelian.");
      navigate("/login");
      return;
    }
    try {
      // SECTION GET PROVINCE, CITY, DISTRICT =========================================================================
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/provinces/${tempProvince}`
      );
      if (!response.ok) {
        throw new Error("Gagal mengambil data provinsi");
      }
      const dataProv = await response.json();

      const response2 = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cities/${tempCity}`
      );
      if (!response2.ok) {
        throw new Error("Gagal mengambil data kota");
      }
      const dataCity = await response2.json();
      console.log("Hasil pencarian:", dataProv);

      const response3 = await fetch(
        `${process.env.REACT_APP_API_URL}/api/districts/${tempDistrict}`
      );
      if (!response3.ok) {
        throw new Error("Gagal mengambil data kecamatan");
      }
      const dataDistrict = await response3.json();

      console.log("Hasil pencarian:", dataProv);
      console.log("Hasil pencarian:", dataCity);
      console.log("Hasil pencarian:", dataDistrict);

      // SECTION POST ADDRESS =========================================================================
      const addressPayload = {
        RecipientName: addressData.RecipientName,
        RecipientNumber: addressData.RecipientNumber, // Contoh nomor tetap
        ProvinceId: dataProv._id,
        CityId: dataCity._id,
        DistrictId: dataDistrict._id, // Sementara disamakan jika input District tidak ada
        PostalCodeId: tempPostalCode,
        Detail: addressData.Detail,
      };
      console.log("Address Payload:", addressPayload);
      const addressRes = await fetch(`${process.env.REACT_APP_API_URL}/api/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressPayload),
      });

      const savedAddress = await addressRes.json();

      if (!addressRes.ok) {
        throw new Error(savedAddress.message || "Gagal menyimpan alamat");
      }
      console.log("Berhasil menyimpan alamat:", savedAddress);

      //SECTION POST DELIVERY =========================================================================
      const date = new Date();
      date.setDate(date.getDate() + 3);
      // const formattedDate = date.toISOString().split('T')[0];

      const deliveryPayload = {
        ShippingCode: "To be inputed"+date.getTime(),
        Service: "GrabSend",
        EstimatedArrival: date,
        TrackingLink: "To be inputed",
        Notes: addressData.Note || "No notes available",
      };

      console.log("Delivery Payload:", deliveryPayload);
      const deliveryRes = await fetch(`${process.env.REACT_APP_API_URL}/api/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryPayload),
      });

      const savedDelivery = await deliveryRes.json();

      if (!deliveryRes.ok) {
        throw new Error(savedAddress.message || "Gagal menyimpan delivery");
      }
      console.log("Berhasil menyimpan delivery :", savedDelivery);

      //SECTION POST 3D MODEL =========================================================================
      let finalData = selectedProduct;
      let currentModelUrl = selectedProduct.modelUrl || "";

      let modelUrl = "";

      if (selectedProduct.isCustomizable && modelScene) {
        console.log("Exporting 3D Model...");
        const result = await handleSaveAndExport();
        console.log("RESULT : ", result);
        modelUrl = result.modelUrl;
        if (!result.success) {
          console.log("gagal simpan");
        }
      }

      const resModel = await fetch(`${process.env.REACT_APP_API_URL}/api/design3d/`);
      const dataModel = await resModel.json();
      const modelId = dataModel.reverse().slice(0, 1)[0]._id;
      // setModel(dataModel.reverse().slice(0, 1)[0]);

      console.log("DATA MODEL : ", dataModel);
      console.log("DATA MODEL2 : ", modelId);
      console.log("DATA URL : ", modelUrl);

      const modelUpdatePayload = {
        ModelId: modelId,
        Path: modelUrl,
      };

      console.log("modelUpdatePayload ", modelUpdatePayload);

      const modelRes = await fetch(
        `${process.env.REACT_APP_API_URL}/api/design3d/${dataModel._id}/add-path`,
        {
          method: "PUT", // Menggunakan PUT/PATCH untuk update data
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modelUpdatePayload),
        }
      );

      const savedModel = await modelRes.json();

      console.log(savedModel);

      //SECTION POST ITEMS
      let collectedIds = [{}];
      // const itemsData = selectedProduct.items;
      const postItems = async (itemsData) => {
        // itemsData adalah array utama dari gambar tersebut
        for (const itemArray of itemsData) {
          const item = itemArray[0];
          if (!item || item.Quantity <= 0) {
            console.log("⏭️ Skip item karena quantity 0:", item);
            continue;
          }
          // Karena tiap item adalah array berisi 1 objek, kita ambil indeks ke-0
          const payload = {
            ItemId: itemArray[0].ItemId,
            Quantity: itemArray[0].Quantity,
          };

          console.log("PAYLOADDDD")
          console.log(payload)

          try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/productdetails`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const savedItems = await response.json();
            const newId = savedItems._id;
            if (newId) {
              collectedIds.push({ tempId: newId });
              console.log(`✅ Tersimpan: ${newId}`);
            }
            console.log(
              `✅ Berhasil simpan ComponentId: ${payload.ItemId}`
            );
          } catch (error) {
            console.error(`❌ Gagal simpan ${payload.ItemId}:`, error);
          }
        }
      };

      if (selectedProduct.isCustomizable === true){
          await postItems(selectedProduct.items);
      }
      

      // console.log("======= collectedIds : ", collectedIds);
      // console.log("======= collectedIds : ", collectedIds[1].tempId);
      const testItem = [{ id: "567890" }];
      // console.log("======= testItem : ", testItem);

      // SECTION POST PRODUCT =========================================================================
      let productIdTemp = "";
      if (selectedProduct.isCustomizable) {
        const tempIdArray = collectedIds
        .filter(item => item.tempId) // buang yang kosong {}
        .map(item => item.tempId);

      console.log(tempIdArray);
        const productPayload = {
          Name: selectedProduct.title,
          Price: productPrice,
          Quantity: 1,
          Image: selectedProduct.thumbnail,
          ThreeDModel: modelId,
          Memo: selectedProduct.pesan,
          ProductDetail: 
            tempIdArray
            // collectedIds[4].tempId,
          ,
          ShopId : selectedProduct.ShopId,
          IsCustomized : 1
        };

        console.log("PRODUCT PAYLOAD : ", productPayload);

        const productRes = await fetch(`${process.env.REACT_APP_API_URL}/api/products/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productPayload),
        });

        const savedProduct = await productRes.json();
        if (!productRes.ok) throw new Error("Gagal memproses pesanan");

        console.log("SAVED PRODUCT : ", savedProduct);

        productIdTemp = savedProduct._id;
      } else {
        productIdTemp = selectedProduct.key;
      }

      console.log("PRODUCT ID TEMP : ", productIdTemp);
      console.log(savedAddress._id);
      console.log(savedDelivery._id);
      console.log(adminFee[0]._id);
      console.log(discountData);
      console.log(discountData.percentage);

      // SECTION POST ORDER =========================================================================
      const orderPayload = {
        Status: 1,
        AddressId: savedAddress._id, // Mengambil ID dari hasil POST pertama
        DeliveryId: savedDelivery._id,
        ProductId: productIdTemp,
        ProductPrice: productPrice,
        AdministrationFee: adminFee[0]._id,
        // DiscountId:
        //   discountData.percentage === null ? null : discountData[0]._id,
        Total: totalOrder,
        ShopId : selectedProduct.ShopId,
        Token : null,
        StatusPembayaran : 2,
        UserId : user._id
      };
      console.log("Order Payload:", orderPayload);
      const orderRes = await fetch(`${process.env.REACT_APP_API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const savedOrder = await orderRes.json();
      if (!orderRes.ok) throw new Error("Gagal memproses pesanan");

      // 🔥 PANGGIL BACKEND UNTUK BUAT MIDTRANS TOKEN
      const midtransRes = await fetch(`${process.env.REACT_APP_API_URL}/api/payment/create-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: savedOrder._id,
          amount: totalOrder,
          customer: {
            name: user.Name,
            email: user.Email,
          },
        }),
      });

      const midtransData = await midtransRes.json();

      console.log("midtrans data ", midtransData.token)

      if (!midtransRes.ok) {
        throw new Error("Gagal membuat transaksi pembayaran");
      }

      const updateToken = await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/${savedOrder._id}/token`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token : String(midtransData.token) }),
        }
      );

      const tokenJson = await updateToken.json();
      console.log("✅ Token updated:", tokenJson);

      if (!window.snap) {
        showAlert("Payment gateway belum siap");
        return;
      }
      setShowPayment(true);
      hideLoading();

      setTimeout(() => {
        window.snap.embed(midtransData.token, {
          embedId: "snap-container",

          onSuccess: async function () {
            try {
              showAlert("Pembayaran berhasil!");

              const StatusTemp = 0;

              const response = await fetch(
                `${process.env.REACT_APP_API_URL}/api/orders/${savedOrder._id}/status-pembayaran`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ StatusPembayaran: StatusTemp }),
                }
              );

              if (!response.ok) {
                throw new Error("Gagal update status pembayaran");
              }

              console.log("✅ Status pembayaran berhasil diupdate");

              await clear();

              navigate("/profile", {
                replace: true,
                state: null,
              });

            } catch (error) {
              console.error("❌ Error onSuccess:", error);
              showAlert("Terjadi kesalahan setelah pembayaran");
            }
          },

          onPending: function () {
            showAlert("Menunggu pembayaran...");

            const StatusTemp = 2;

            fetch(
              `${process.env.REACT_APP_API_URL}/api/orders/${savedOrder._id}/status-pembayaran`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ StatusPembayaran: StatusTemp }),
              }
            );

            clear();

            navigate("/profile", {
              replace: true,
              state: null,
            });
          },

          onError: async function () {
            showAlert("Pembayaran gagal!");

            const StatusTemp = 1;

            try {
              await fetch(
                `${process.env.REACT_APP_API_URL}/api/orders/${savedOrder._id}/status-pembayaran`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ StatusPembayaran: StatusTemp }),
                }
              );

              const updateStock = async (items, type) => {
                const res = await fetch(
                  `${process.env.REACT_APP_API_URL}/api/items/update-stock`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items, type }),
                  }
                );

                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
              };

              await updateStock(selectedProduct.items, "increase");

              clear();

              navigate("/profile", {
                replace: true,
                state: null,
              });

            } catch (error) {
              console.error("❌ Error onError:", error);
              showAlert("Gagal rollback stok");
            }
          },

          onClose: function () {
            showAlert("Kamu menutup pembayaran.");

            const StatusTemp = 2;

            fetch(
              `${process.env.REACT_APP_API_URL}/api/orders/${savedOrder._id}/status-pembayaran`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ StatusPembayaran: StatusTemp }),
              }
            );

            clear();

            navigate("/profile", {
              replace: true,
              state: null,
            });
          },
        });

      },100);
      


    // ================= MIDTRANS END =================

      const userUpdatePayload = {
        OrderId: savedOrder._id, // Kirim ID order baru untuk di-push ke array Orders di backend
      };

      console.log("User Update Payload:", userUpdatePayload);
      console.log("User Info:", user);

      // const userRes = await fetch(
      //   `${process.env.REACT_APP_API_URL}/api/users/${user._id}/add-order`,
      //   {
      //     method: "PUT", // Menggunakan PUT/PATCH untuk update data
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify(userUpdatePayload),
      //   }
      // );

      // if (userRes.ok) {
      //   showAlert("Transaksi Berhasil! Pesanan telah dicatat di akun Anda.");
      //   // navigate("/orders", {
      //   //   state: {
      //   //     selectedProduct: selectedProduct,
      //   //     orderId: savedOrder._id,
      //   //   },
      //   // });
      // } else {
      //   console.error("Gagal sinkronisasi ke tabel User");
      //   // Tetap pindah halaman karena Order utama sudah sukses
      //   // navigate("/orders");
      // }

      // if (userRes.ok) {
      //   showAlert("Pembayaran Berhasil Diproses!");
      //   // navigate("/orders", {
      //   //   state: {
      //   //     selectedProduct: selectedProduct,
      //   //     orderId: savedOrder._id,
      //   //   },
      //   // });
      // } else {
      //   showAlert("Gagal memproses order: " + savedOrder.message);
      // }
    } catch (error) {
      console.error("Error Transaction:", error);
      showAlert("Terjadi kesalahan: " + error.message);
    }
  };
  const handleSaveAndExport = async () => {
    // 1. Validasi Input (Gunakan data yang ada atau nilai default)
    const name = selectedProduct?.title || "Customized Bouquet";
    const finalQuestion = selectedProduct?.question; // Sesuaikan jika ada state question
    const finalAnswer = selectedProduct?.answer; // Sesuaikan jika ada state answer

    // 2. Siapkan Data Metadata (JSON)
    const designData = {
      path: "test-path",
      question: finalQuestion,
      answer: finalAnswer,
      // Tambahkan field lain yang dibutuhkan backend /api/design3d/save
    };

    try {
      console.log("1. Menyimpan metadata desain...");
      const saveRes = await fetch(`${process.env.REACT_APP_API_URL}/api/design3d/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(designData),
      });

      const savedData = await saveRes.json();
      if (!saveRes.ok)
        throw new Error(savedData.message || "Gagal simpan metadata");

      const newDesignId = savedData._id || savedData.designId;
      console.log("✅ Metadata tersimpan. ID:", newDesignId);

      // 3. Proses Ekspor modelScene ke GLTF (JSON)
      if (!modelScene) throw new Error("modelScene tidak ditemukan!");

      console.log("2. Memulai ekspor modelScene ke GLTF...");

      const exporter = new GLTFExporter();
      const options = { binary: false, embedImages: true, onlyVisible: true };

      // Bungkus exporter ke Promise agar bisa di-await
      const exportResult = await new Promise((resolve, reject) => {
        exporter.parse(
          modelScene,
          (result) => resolve(result),
          (error) => reject(error),
          options
        );
      });

      // 4. Konversi hasil ke Blob & Upload
      const outputJSON = JSON.stringify(exportResult, null, 2);
      const blob = new Blob([outputJSON], { type: "application/json" });
      const formData = new FormData();
      formData.append("model", blob, `${newDesignId}.gltf`);

      console.log("3. Mengunggah file GLTF ke server...");
      const exportRes = await fetch(
        `${process.env.REACT_APP_API_URL}/api/design3d/${newDesignId}/export`,
        {
          method: "POST",
          body: formData,
        }
      );

      const exportData = await exportRes.json();
      if (!exportRes.ok)
        throw new Error(exportData.message || "Gagal upload file GLTF");

      console.log("✅ Semua proses berhasil!", exportData.modelUrl);

      if (exportData.success) {
        // Simpan URL yang dikembalikan backend: "/models/exported/ID.gltf"
        setCurrentModelPath(exportData.modelUrl);
      }
      setCurrentModelPath(exportData.modelUrl);
      console.log(exportData.modelUrl);

      // 5. Lanjutkan ke alur pembayaran/navigasi
      return {
        success: true,
        designId: newDesignId,
        modelUrl: exportData.modelUrl,
      };
    } catch (err) {
      console.error("❌ Error dalam proses Save & Export:", err);
      showAlert(err.message);
      return { success: false };
    }
  };
  return (
    <div>
      <section className="PaymentSection">
        <div className="box"></div>
        <div className="PaymentContainer">
          <div style={{ alignSelf: "flex-start", color: "#A95C4C" }}>
            <h1>Pembayaran</h1>
          </div>
          <div className="MainBoxPayment" style={{ color: "#404C4C" }}>
            <div className="LeftMainBox">
              <p
                style={{
                  paddingLeft: "2rem",
                  alignSelf: "flex-start",
                  fontSize: "20px",
                }}
              >
                Order Summary
              </p>
              <div className="PaymentProduct">
                <div
                  className="PaymentProductPicture"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                  }}
                >
                  <img
                    src={selectedProduct?.thumbnail || selectedProduct?.image}
                    alt="Product"
                    style={{ width: "70%", height: "70%" }}
                  />
                </div>
                <div className="PaymentProductInfo">
                  <div
                    className="PaymentProductName"
                    style={{ fontSize: "20px", height: "20%" }}
                  >
                    {selectedProduct?.title || "FAILED TO LOAD"}
                  </div>
                  <div
                    className="PaymentProductDetails"
                    style={{ fontSize: "12px", height: "30%" }}
                  >
                    {selectedProduct?.description || "No description available"}
                  </div>
                  <div
                    className="PaymentPriceBox"
                    style={{ fontSize: "16px", height: "20%" }}
                  >
                    <div className="PaymentQuantity">x 1</div>
                    <div className="PaymentPrice" style={{ color: "#A95C4C" }}>
                      {formatRupiah(productPrice)}
                    </div>
                  </div>
                  <div
                    className="PaymentNotes"
                    style={{ fontSize: "12px", height: "30%" }}
                  >
                    Notes : <br />
                    {selectedProduct?.catatan || "No notes available"}
                  </div>
                </div>
              </div>

              <div className="PaymentSummary" style={{ fontSize: "16px" }}>
                <div className="PaymentSummaryItem">
                  <div className="PaymentSummaryLeft">Subtotal Produk</div>
                  <div className="PaymentSummaryRight">
                    {formatRupiah(productPrice)}
                  </div>
                </div>

                <div className="PaymentSummaryItem">
                  <div className="PaymentSummaryLeft">Subtotal Pengiriman</div>
                  <div className="PaymentSummaryRight">
                    {formatRupiah(shippingFee)}
                  </div>
                </div>

                <div className="PaymentSummaryItem">
                  <div className="PaymentSummaryLeft">Biaya Layanan</div>
                  <div className="PaymentSummaryRight">
                    {formatRupiah(adminFeeAmount)}
                  </div>
                </div>

                {/* <div className="PaymentSummaryItem">
                  <div className="PaymentSummaryLeft">Total Diskon</div>
                  <div className="PaymentSummaryRight" style={{ color: "red" }}>
                    - {formatRupiah(calculatedDiscount)}
                  </div>
                </div> */}

                <div className="PaymentSummaryItem">
                  <div className="PaymentSummaryLeft">Total Pesanan</div>
                  <div
                    className="PaymentSummaryRight"
                    style={{ color: "#A95C4C", fontWeight: "bold" }}
                  >
                    {formatRupiah(totalOrder)}
                  </div>
                </div>

                <div className="PaymentSummaryItem">
                  <div className="PaymentSummaryLeft">Metode Pembayaran</div>
                  <div className="PaymentSummaryRight">(Pilih Melalui Payment Gateway)</div>
                </div>
              </div>
            </div>

            <div
              className="RightMainBox"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // boxSizing: "border-box",
              }}
            >
              {!showPayment ? (<button className="Payment-btnConfirm" onClick={handleCardSelect}>
              Process Order
            </button>) : (<div
                id="snap-container"
                style={{ width: "100%",
                  height: "550px", // boleh kamu adjust
                  overflowY: "auto",
                  borderRadius: "10px" }}
              ></div>)
            }
              
            </div>
          </div>
          <div
            className="Payment-btnContainer"
            style={{ display: "flex", alignSelf: "flex-end" }}
          >
            {/* <button className="Payment-btnConfirm" onClick={handleCardSelect}>
              Process Order
            </button> */}
          </div>
        </div>
        <div className="box"></div>
      </section>
    </div>
  );
}

export default function Payment() {
  const selectedProduct = window.history.state?.usr?.selectedProduct;
  const addressData = window.history.state?.usr?.addressData;
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  useEffect(() => {
    if (!selectedProduct) {
      showAlert("Data produk tidak ditemukan. Silakan ulangi dari awal.");

      navigate("/profile", { replace: true });
    }
  }, [selectedProduct, navigate]);

  const [adminFee, setAdminFee] = useState([]);
  const [discountData, setDiscountData] = useState([]);
  const hasFetched = useRef(false);
  const [modelScene, setModelScene] = useState(null);

  const { showLoading, hideLoading } = useLoading();
  
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", "Mid-client-7vNauj8bb3yiXmEQ");
    script.async = true;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const loadAndParseModel = async () => {
      const data = await getDb("pending_order_model");
      if (data) {
        const loader = new GLTFLoader();
        // Parse data biner menjadi objek Three.js
        loader.parse(data, "", (gltf) => {
          setModelScene(gltf.scene);
        });
      }
    };
    loadAndParseModel();
    fetchData(); // Fungsi fetch admin fee & discount Anda
  }, []);

  const fetchData = async () => {
    showLoading("Menyiapkan data pembayaran...");
    try {
      // Fetch Admin Fee
      const resFee = await fetch(`${process.env.REACT_APP_API_URL}/api/adminfees/`);
      const dataFee = await resFee.json();
      setAdminFee(dataFee.reverse().slice(0, 1));

      console.log("AAQ DISKON ", selectedProduct.voucher);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/discounts/get-voucher?name=${selectedProduct.voucher}`
      );
      if (!response.ok) {
        throw new Error("Gagal mengambil data voucher");
      }
      const dataDisc = await response.json();
      // Fetch Discount
      // const resDisc = await fetch(`${process.env.REACT_APP_API_URL}/api/discounts/`);
      // const dataDisc = await resDisc.json();
      setDiscountData(dataDisc);

      if(dataDisc.length === 0 || selectedProduct.voucher === "" || selectedProduct.voucher === undefined){
        const discountNA = {
          Name: "VOUCHER NOT FOUND",
          Percentage: 0.0,
        };
        setDiscountData(discountNA);
        console.log("VOUCHER NOT FOUND, set default discount data");
      }

      console.log("DISCOUNT DATA : ", discountData);
    } catch (error) {
      console.log("Error fetching data:", error);
      const discountNA = {
        Name: "VOUCHER NOT FOUND",
        Percentage: 0.0,
      };
      setDiscountData(discountNA);
    }
    hideLoading();
  };

  useEffect(() => {
    if (!hasFetched.current) {
      fetchData();
      hasFetched.current = true;
    }
  }, []);

  console.log("selected ", selectedProduct);

  return (
    <div>
      <MainSection
        selectedProduct={selectedProduct}
        addressData={addressData}
        adminFee={adminFee}
        discountData={discountData}
        modelScene={modelScene}
      />
    </div>
  );
}
