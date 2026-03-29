import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { useLoading } from "../../contexts/LoadingContext";

const SectionLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
    <div className="spinner"></div>
  </div>
);

const FloristManageOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { showLoading, hideLoading } = useLoading();

  const [isLoading, setIsLoading] = useState(true);

  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    productName: "",
    productImage: "",
    address: "",
    status: 0,
  shippingCode: "",
  trackingLink: "",
  service: ""
  });

  const isCancelDisabled = [3, 4, 5].includes(formData.status);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      showAlert("Alasan cancel wajib diisi");
      return;
    }

    setIsCancelling(true);
    showLoading("Memproses pembatalan...");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/orders/${id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancelReason,
          }),
        }
      );

      if (!res.ok) throw new Error("Gagal cancel order");

      showAlert("Order berhasil dibatalkan");
      setShowCancelPopup(false);
      navigate(-1);

    } catch (error) {
      showAlert("Gagal membatalkan order");
    } finally {
      setIsCancelling(false);
      hideLoading();
    }
  };

  // 🔥 FETCH ORDER DETAIL
  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/orders/${id}`);
      const data = await res.json();

      console.log("Fetched order data:", data); // Debug log

      const addressParts = [
      data.AddressId?.Detail,
      data.AddressId?.DistrictId?.district_name,
      data.AddressId?.CityId?.city_name,
      data.AddressId?.ProvinceId?.province_name,
      data.AddressId?.PostalCodeId
    ].filter(Boolean);

      if (res.ok) {
        setFormData({
          customerName: data.UserId?.Name || "-",
          productName: data.ProductId?.Name || "Custom Bouquet",
          productImage: data.ProductId?.Image
            ? `${data.ProductId.Image}`
            : "/no-image.png",
          address: addressParts.join(", ") || "-",
          status: data.Status,
          shippingCode: data.DeliveryId.ShippingCode || "-",
          trackingLink: data.DeliveryId.TrackingLink || "-",
          service: data.DeliveryId.Service || "-"
        });
      } else {
        showAlert("Gagal mengambil data order");
      }
    } catch {
      showAlert("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  }, [id, showAlert]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // 🔥 HANDLE SAVE (UPDATE STATUS SAJA)
    const handleSave = async () => {
    showLoading("Menyimpan perubahan...");

    try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/orders/update-status/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            Status: formData.status,
            ShippingCode: formData.shippingCode,
            TrackingLink: formData.trackingLink,
            Service: formData.service
        })
        });

        if (res.ok) {
        showAlert("Data berhasil diperbarui!");
        navigate(-1);
        } else {
        showAlert("Gagal update");
        }
    } catch {
        showAlert("Terjadi kesalahan koneksi");
    } finally {
        hideLoading();
    }
    };

  return (
    <div className="FloristManageBouquetContainer">
      <button className="TernaryBackButton" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>

      <h2 className="FloristManageBouquetTitle">
        Pesanan #{id.slice(-6)}
      </h2>

      {isLoading ? <SectionLoading /> : (
        <div className="FloristManageBouquetForm">

          {/* NAMA PEMBELI */}
          <div className="FloristInputGroup">
            <label>Nama Pembeli</label>
            <input type="text" value={formData.customerName} disabled />
          </div>

          {/* PESANAN */}
          <div className="FloristInputGroup">
            <label>Pesanan</label>
            <input type="text" value={formData.productName} disabled />
          </div>

          {/* FOTO PRODUK */}
          <div className="FloristInputGroup">
            <label>Foto Produk</label>
            <div className="FloristImageUploader" style={{ cursor: "default" }}>
              <img
                src={formData.productImage}
                alt="product"
                className="PreviewImg"
              />
            </div>
          </div>

          {/* ALAMAT */}
          <div className="FloristInputGroup">
            <label>Alamat</label>
            <input type="text" value={formData.address} disabled />
          </div>

          {/* STATUS */}
          <div className="FloristInputGroup">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: parseInt(e.target.value) })
              }
            >
              <option value={2}>Pesanan Disiapkan</option>
              <option value={3}>Pesanan Dikirim</option>
            </select>
          </div>
          {/* SERVICE */}
            <div className="FloristInputGroup"> 
            <label>Service Pengiriman</label>
            <input
                type="text"
                value={formData.service}
                onChange={(e) =>
                setFormData({ ...formData, service: e.target.value })
                }
                placeholder="Contoh: JNE REG"
            />
            </div>

            {/* SHIPPING CODE */}
            <div className="FloristInputGroup">
            <label>Kode Resi</label>
            <input
                type="text"
                value={formData.shippingCode}
                onChange={(e) =>
                setFormData({ ...formData, shippingCode: e.target.value })
                }
                placeholder="Masukkan kode resi"
            />
            </div>

            {/* TRACKING LINK */}
            <div className="FloristInputGroup">
            <label>Link Tracking</label>
            <input
                type="text"
                value={formData.trackingLink}
                onChange={(e) =>
                setFormData({ ...formData, trackingLink: e.target.value })
                }
                placeholder="https://..."
            />
            </div>

          <button className="FloristSubmitBtn" onClick={handleSave}>
            Simpan
          </button>

          <button
            style={{
              marginTop: "10px",
              backgroundColor: isCancelDisabled ? "#ccc" : "#d9534f",
              color: "white",
              cursor: isCancelDisabled ? "not-allowed" : "pointer",
            }}
            className="FloristSubmitBtn"
            onClick={() => {
              if (!isCancelDisabled) setShowCancelPopup(true);
            }}
            disabled={isCancelDisabled}
          >
            Cancel Order
          </button>

        </div>
      )}

      {showCancelPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "400px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <h3>Batalkan Pesanan</h3>

            <textarea
              placeholder="Masukkan alasan pembatalan..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                minHeight: "100px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowCancelPopup(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#ccc",
                }}
              >
                Batal
              </button>

              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#d9534f",
                  color: "white",
                }}
              >
                {isCancelling ? "Processing..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    
  );
};

export default FloristManageOrder;