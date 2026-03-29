import React, { useState, useEffect, useContext, useCallback } from "react";
import { FaChevronLeft, FaChevronRight, FaSearch, FaRegEdit, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";

const SectionError = ({ onRetry }) => (
  <div style={{ textAlign: 'center', padding: '3rem' }}>
    <p className="p1 txt-color-ternary" style={{ marginBottom: '1.5rem' }}>
      Oops... terjadi kesalahan silakan coba lagi
    </p>
    <button className="RoundedButtonPrimary" onClick={onRetry}>
      Coba Lagi
    </button>
  </div>
);

const SectionLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
    <div className="spinner"></div>
  </div>
);

const FloristOrders = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Buket Template");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 8;

  const [selectedIds, setSelectedIds] = useState([]);
  const [orderState, setOrderState] = useState({
    data: [],
    loading: true,
    error: false
  });

  // 🔥 FETCH ORDERS
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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  console.log("Filtered Order state:", orderState.data);

const filteredData = orderState.data
  .filter((item) => {
    if (!item.ProductId || !item.ProductId.Name) return false;

    if (activeTab === "Buket Template") return item.ProductId.IsCustomized === 0;
    if (activeTab === "Buket Custom") return item.ProductId.IsCustomized === 1;

    return true;
  });
  console.log("Filtered Orders:", filteredData);
  console.log("Filtered Order state:", orderState.data);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const displayedItems = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(displayedItems.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleIndividualSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

    const getStatusLabel = (status) => {
    switch (status) {
        case 0: return "Pesanan Dibuat";
        case 1: return "Pembayaran Berhasil";
        case 2: return "Pesanan Disiapkan";
        case 3 : return "Pesanan Dikirim";
        case 4 : return "Pesanan Tiba";
        case 5 : return "Pesanan Dibatalkan";
        default: return "Unknown";
    }
    };

    const getStatusStyle = (status) => {
    switch (status) {
        case 5:
        return { bg: "#FEE2E2", color: "#B42318" };
        case 4:
        return { bg: "#D1FADF", color: "#027A48" };
        case 3:
        return { bg: "#D1FADF", color: "#027A48" };
        case 2:
        return { bg: "#D1FADF", color: "#027A48" };
        case 1:
        return { bg: "#FEF3C7", color: "#B54708" };
        default:
        return { bg: "#FEE2E2", color: "#B42318" };
    }
    };

  return (
    <div className="FloristDashboardContainer">
      <h1 className="FloristDashboardTitle">Pesanan</h1>

      {/* 🔥 TAB TEMPLATE / CUSTOM */}
      <div className="FloristTabContainer">
        {["Buket Template", "Buket Custom"].map((tab) => (
          <button
            key={tab}
            className={`FloristTabItem ${activeTab === tab ? "FloristTabActive" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
              setSelectedIds([]);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="FloristOrdersTableSection">
        {/* SEARCH */}
        <div className="FloristOrdersHeader" style={{ justifyContent: 'flex-end' }}>
          <div className="FloristSearchWrapper">
            <FaSearch className="FloristSearchIcon" />
            <input
              type="text"
              placeholder={`Cari ${activeTab}...`}
              className="FloristSearchInput"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* LOADING / ERROR */}
        {orderState.loading ? (
          <SectionLoading />
        ) : orderState.error ? (
          <SectionError onRetry={fetchOrders} />
        ) : (
          <>
            <div className="FloristTableResponsive">
              <table className="FloristMainTable">
                <thead>
                  <tr>
                    <th style={{ width: "60px", textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          displayedItems.length > 0 &&
                          selectedIds.length === displayedItems.length
                        }
                      />
                    </th>
                    <th className="p2 weight-semibold">Kode Pesanan</th>
                    <th className="p2 weight-semibold">Pembeli</th>
                    <th className="p2 weight-semibold">Produk</th>
                    <th className="p2 weight-semibold">Status</th>
                    <th className="p2 weight-semibold" style={{ textAlign: 'center' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                {displayedItems.length > 0 ? (
                    displayedItems.map((item) => {
                    const statusStyle = getStatusStyle(item.Status);

                    return (
                        <tr key={item._id}>

                        {/* CHECKBOX */}
                        <td style={{ textAlign: 'center' }}>
                            <input
                            type="checkbox"
                            checked={selectedIds.includes(item._id)}
                            onChange={() => handleIndividualSelect(item._id)}
                            />
                        </td>

                        {/* KODE PESANAN */}
                        <td className="p2 weight-bold">
                            {item._id.slice(-8)}
                        </td>

                        {/* PEMBELI */}
                        <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <FaUserCircle style={{ color: '#ccc', fontSize: '1.5rem' }} />
                                <div className="FloristBuyerInfo">
                                    <p className="FloristBuyerName p2 weight-semibold">{item.UserId?.Name || "Guest"}</p>
                                    <p className="FloristBuyerSub p3">{item.UserId?.Email || ""}</p>
                                </div>
                            </div>
                        </td>

                        {/* PRODUK */}
                        <td className="p2">
                            {item.ProductId?.Name || "Custom Bouquet"}
                        </td>

                        {/* STATUS */}
                        <td>
                            <span
                            style={{
                                padding: "5px 12px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                backgroundColor: statusStyle.bg,
                                color: statusStyle.color,
                            }}
                            >
                            {getStatusLabel(item.Status)}
                            </span>
                        </td>

                        {/* AKSI */}
                        <td style={{ textAlign: "center" }}>
                            <FaRegEdit
                            className="InventoryActionIcon"
                            onClick={() => navigate(`/florist/orders/edit/${item._id}`)}
                            />
                        </td>

                        </tr>
                    );
                    })
                ) : (
                    <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "4rem" }}>
                        Tidak ada pesanan.
                    </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="InventoryFooterContainer">
              <div className="FloristPagination">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>
                  <FaChevronLeft />
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)}>
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}

                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FloristOrders;