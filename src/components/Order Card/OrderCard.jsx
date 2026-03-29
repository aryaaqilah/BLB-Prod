import React from "react";
import { useNavigate } from "react-router-dom";
import "./OrderCard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShare } from "@fortawesome/free-solid-svg-icons";
import { useAlert } from "../../contexts/AlertContext";
import { clear } from "idb-keyval";
import { useEffect, useState, useRef, useContext } from "react";
import { useLoading } from "../../contexts/LoadingContext";

const OrderCard = ({ order }) => {
  const { showLoading, hideLoading } = useLoading();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleDetailClick = () => {
    navigate(`/order-detail/${order.orderId}`);
  };

  const handleCopyLink = () => {
    const linkToCopy = `${process.env.REACT_APP_API_URL}/api/design3d/${order.threeDPath}/ar`;

    navigator.clipboard
      .writeText(linkToCopy)
      .then(() => {
        showAlert("Link berhasil disalin ke clipboard!");
      })
      .catch((err) => {
        console.error("Gagal menyalin link: ", err);
      });
  };

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

  const handlePayment = (order) => {
    showLoading("Memproses pembayaran...");
    
    window.snap.pay(order.token, {
          onSuccess: async function () {
          try {
            console.log("✅ Pembayaran berhasil:", order);
            // showAlert("Pembayaran berhasil!");
    
            const StatusTemp = 0;
    
            const response = await fetch(
              `${process.env.REACT_APP_API_URL}/api/orders/${order.orderId}/status-pembayaran`,
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
    
            await clear(); // idb-keyval
    
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
            // showAlert("Menunggu pembayaran...");
            const StatusTemp = 2;
            clear();
            navigate("/profile", {
              // state: {
              //   selectedProduct,
              //   orderId: savedOrder._id,
              // },
                replace: true,
                state: null,
            });
          },
    
          onError: async function () {
            // showAlert("Pembayaran gagal!");
            const StatusTemp = 1;
            clear();
            const updateStatus = fetch(
              `${process.env.REACT_APP_API_URL}/api/orders/${order.orderId}/status-pembayaran`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ StatusPembayaran : StatusTemp }),
              }
            );

            const updateStock = async (items, type) => {
              const res = await fetch(`${process.env.REACT_APP_API_URL}/api/items/update-stock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items, type }),
              });

              const data = await res.json();

              if (!res.ok) throw new Error(data.message);
            };
    
            await updateStock(order.productDetails, "increase");
            updateStatus();
            navigate("/profile", {
              // state: {
              //   selectedProduct,
              //   orderId: savedOrder._id,
              // },
                replace: true,
                state: null,
            });
          },
    
          onClose: function () {
            // showAlert("Kamu menutup pembayaran.");
            clear();
            const StatusTemp = 2;
                    navigate("/profile", {
              // state: {
              //   selectedProduct,
              //   orderId: savedOrder._id,
              // },
                replace: true,
                state: null,
            });
          },
        });
  }

  return (
    <div className="OrderCard txt-color-ternary">
      {/* Order Header Info */}
      <div className="OrderInfo">
        <div className="LeftItem">
          <div>
            <p className="p1">STATUS PESANAN</p>
            <span className="p2">   
              {order.statusPembayaran === 2 ? (
            <span>
              Belum Dibayar
            </span>
            ) : (
              <span className="p2">{order.status}</span>
            )}
            </span>
          </div>
          <div>
            <p className="p1">TOTAL</p>
            <span className="p2">{order.totalOrder}</span>
          </div>
          <div>
            <p className="p1">ALAMAT</p>
            {/* The model now provides a single flattened fullAddress string */}
            <span className="p2">{order.fullAddress}</span>
          </div>
        </div>
        <div className="RightItem">
          {/* Mapping to the "DALAM PENGIRIMAN" or status header in the top right */}
          <p className="p1">
            {order.statusPembayaran === 2 ? (
            <span
              onClick={() => handlePayment(order)}
              style={{
                color: "#A95C4C",
                textDecoration: "underline",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              BAYAR DISINI
            </span>
            
            ) : (
              <span className="p2">{order.status}</span>
            )}
          </p>
          <span className="p2 tiny">ORDER #{order.orderId}</span>
        </div>
      </div>

      <div className="ProductDetail">
        <div className="ProductImage">
          <img src={order.productImageUrl} alt={order.productName} />
        </div>

        <div className="LeftItem">
          <h2>{order.productName}</h2>
          <p className="p1">{order.productDescription}</p>
          <ul className="p2 OrderList">
            {/* customizationDetails is the array from our mapper */}
            {order.customizationDetails &&
              order.customizationDetails.map((detail, index) => (
                <li key={index}>- {detail}</li>
              ))}
          </ul>
        </div>

        <div className="RightItemBox">
          <div className="RightItem">
            <div className="Quantity">
              <span>Qty</span>
              <div className="QuantityBox">{order.quantity}</div>
            </div>
            <button
              className="Order-button-primary-fill button-primary-fill"
              onClick={handleDetailClick}
            >
              Lihat Detail
            </button>
          </div>
          <div
            className="ShareSection"
            onClick={handleCopyLink}
            style={{ cursor: "pointer" }}
            title="Salin Link"
          >
            <FontAwesomeIcon icon={faShare} />
            <p>Bagikan</p>
          </div>
        </div>
      </div>

      <div className="OrderFooter">
        <div>
          {/* Using the estimatedArrival field from the model */}
          <span className="p3">Estimasi Pengiriman : </span>
          <span className="p3">{order.estimatedArrival}</span>
        </div>
        <a href="#admin" className="p2">
          Hubungi Admin
        </a>
      </div>
    </div>
  );
};

export default OrderCard;
