import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { FaChevronLeft, FaChevronRight, FaUserCircle, FaStar } from "react-icons/fa";
import { AuthContext } from "../../contexts/AuthContext";

const SectionError = ({ onRetry }) => (
  <div style={{ textAlign: 'center', padding: '3rem' }}>
    <p className="p1 txt-color-ternary" style={{ marginBottom: '1.5rem' }}>Oops... terjadi kesalahan silakan coba lagi</p>
    <button className="rounded-button-primary" onClick={onRetry}>Coba Lagi</button>
  </div>
);

const SectionLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner"></div></div>
);

const FloristDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("Pesanan");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [orderState, setOrderState] = useState({ data: [], loading: true, error: false });
  const [ratingState, setRatingState] = useState({ data: [], loading: true, error: false });

  // Map label status dari angka ke teks
  const statusLabels = {
    0: "Pesanan Dibuat",
    1: "Pembayaran Berhasil",
    2: "Pesanan Disiapkan",
    3: "Dalam Pengiriman",
    4: "Pesanan Selesai",
  };

  const fetchOrders = useCallback(async () => {
    if (!user?._id) return;
    setOrderState(prev => ({ ...prev, loading: true, error: false }));
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/orders/florist/${user._id}`);
      const data = await res.json();
      if (res.ok) {
        const uniqueOrders = Array.from(new Map(data.map(item => [item._id, item])).values());
        setOrderState({ data: uniqueOrders, loading: false, error: false });
      } else throw new Error();
    } catch {
      setOrderState({ data: [], loading: false, error: true });
    }
  }, [user?._id]);

  const fetchRatings = useCallback(async () => {
    if (!user?._id) return;
    setRatingState(prev => ({ ...prev, loading: true, error: false }));
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/ratings/florist/${user._id}`);
      const data = await res.json();
      if (res.ok) {
        const uniqueRatings = Array.from(new Map(data.map(item => [item._id, item])).values());
        setRatingState({ data: uniqueRatings, loading: false, error: false });
      } else throw new Error();
    } catch {
      setRatingState({ data: [], loading: false, error: true });
    }
  }, [user?._id]);

  useEffect(() => {
    fetchOrders();
    fetchRatings();
  }, [fetchOrders, fetchRatings]);

  const getStatusClass = (s) => {
    // Jika status adalah angka 3 atau teks "DALAM PENGIRIMAN"
    if (s === 3 || String(s).toUpperCase() === "DALAM PENGIRIMAN") return "Shipping";
    // Jika status adalah angka 4 atau teks "PESANAN SELESAI"
    if (s === 4 || String(s).toUpperCase() === "PESANAN SELESAI") return "Done";
    return "Done"; // Default color
  };

  const currentData = activeTab === "Pesanan" ? orderState.data.slice(0, 10) : ratingState.data;
  const isCurrentLoading = activeTab === "Pesanan" ? orderState.loading : ratingState.loading;
  const isCurrentError = activeTab === "Pesanan" ? orderState.error : ratingState.error;

  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const displayedItems = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="FloristDashboardContainer">
      <h1 className="FloristDashboardTitle">Dashboard</h1>

      <div className="FloristStatsGrid">
        <div className="FloristStatCard FloristSageBackground">
          <div className="FloristStatCircle">
            {ratingState.data.length > 0 ? (ratingState.data.reduce((a, b) => a + b.Rating, 0) / ratingState.data.length).toFixed(1) : "0"}
          </div>
          <p className="p1 txt-color-white">Rating</p>
        </div>
        <div className="FloristStatCard FloristRoseBackground">
          <div className="FloristStatCircle">{orderState.data.filter(o => o.Status !== 4).length}</div>
          <p className="p1 txt-color-white">Pesanan Berjalan</p>
        </div>
        <div className="FloristStatCard FloristTanBackground">
          <div className="FloristStatCircle">{orderState.data.filter(o => o.Status === 3).length}</div>
          <p className="p1 txt-color-white">Pesanan Dikirim</p>
        </div>
      </div>

      <div className="FloristTabContainer">
        <button className={`FloristTabItem ${activeTab === "Pesanan" ? "FloristTabActive" : ""}`} onClick={() => { setActiveTab("Pesanan"); setCurrentPage(1); }}>Pesanan Terkini</button>
        <button className={`FloristTabItem ${activeTab === "Rating" ? "FloristTabActive" : ""}`} onClick={() => { setActiveTab("Rating"); setCurrentPage(1); }}>Rating & Ulasan</button>
      </div>

      <div className="FloristOrdersTableSection">
        <div className="FloristOrdersHeader">
          <h2 className="h2 txt-color-primary">{activeTab === "Pesanan" ? "Daftar Pesanan" : "Ulasan Pelanggan"}</h2>
        </div>

        {isCurrentLoading ? <SectionLoading /> : isCurrentError ? <SectionError onRetry={activeTab === "Pesanan" ? fetchOrders : fetchRatings} /> : (
          <>
            <div className="FloristTableResponsive">
              <table className="FloristMainTable">
                <thead>
                  {activeTab === "Pesanan" ? (
                    <tr>
                      <th className="p2 weight-semibold">Kode</th>
                      <th className="p2 weight-semibold">Pembeli</th>
                      <th className="p2 weight-semibold">Produk</th>
                      <th className="p2 weight-semibold">Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p2 weight-semibold">Pembeli</th>
                      <th className="p2 weight-semibold">Rating</th>
                      <th className="p2 weight-semibold">Ulasan</th>
                      <th className="p2 weight-semibold">Tanggal</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {displayedItems.length > 0 ? displayedItems.map((item) => (
                    <tr key={item._id}>
                      {activeTab === "Pesanan" ? (
                        <>
                          <td className="p2">#{item._id.substring(item._id.length - 5).toUpperCase()}</td>
                          <td>
                            <div className="FloristBuyerCell">
                              <FaUserCircle style={{ color: '#ccc', fontSize: '1.5rem' }} />
                              <div className="FloristBuyerInfo">
                                <p className="FloristBuyerName p2 weight-semibold">{item.UserId?.Name || "Guest"}</p>
                                <p className="FloristBuyerSub p3">{item.UserId?.Email || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p2">{item.ProductId?.Name || "Customized"}</td>
                          <td>
                            <span className={`FloristStatusPill FloristStatus${getStatusClass(item.Status)}`}>
                              {statusLabels[item.Status] || item.Status}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <div className="FloristBuyerCell">
                                <FaUserCircle style={{ color: '#ccc', fontSize: '1.5rem' }} />
                                <p className="p2 weight-semibold">{item.OrderId?.UserId?.Name || "User"}</p>
                            </div>
                          </td>
                          <td className="p2">
                            {[...Array(5)].map((_, i) => (
                                <FaStar key={i} color={i < item.Rating ? "#FFD700" : "#ddd"} />
                            ))}
                          </td>
                          <td className="p2">{item.Ulasan}</td>
                          <td className="p2">{new Date(item.CreatedAt).toLocaleDateString('id-ID')}</td>
                        </>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>Data tidak ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="FloristPagination">
                <button className="FloristPagArrow" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}><FaChevronLeft /></button>
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i} 
                    className={`FloristPagNum ${currentPage === i + 1 ? "FloristPagActive" : ""}`} 
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
                <button className="FloristPagArrow" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}><FaChevronRight /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FloristDashboard;