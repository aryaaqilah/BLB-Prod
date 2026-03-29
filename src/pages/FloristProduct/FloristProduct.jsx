import React, { useState, useEffect, useContext, useCallback } from "react";
import { FaChevronLeft, FaChevronRight, FaSearch, FaRegTrashAlt, FaRegEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { useLoading } from "../../contexts/LoadingContext";

const SectionError = ({ onRetry }) => (
  <div style={{ textAlign: 'center', padding: '3rem' }}>
    <p className="p1 txt-color-ternary" style={{ marginBottom: '1.5rem' }}>Oops... terjadi kesalahan silakan coba lagi</p>
    <button className="RoundedButtonPrimary" onClick={onRetry}>Coba Lagi</button>
  </div>
);

const SectionLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
    <div className="spinner"></div>
  </div>
);

const FloristProduct = () => {
  const { user } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const { showLoading, hideLoading } = useLoading();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Buket");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 8;

  const [selectedIds, setSelectedIds] = useState([]);
  const [productState, setProductState] = useState({ data: [], loading: true, error: false });
  const [itemState, setItemState] = useState({ data: [], loading: true, error: false });

  const fetchProducts = useCallback(async () => {
    if (!user?._id) return;
    setProductState(prev => ({ ...prev, loading: true, error: false }));
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/products/florist/${user._id}`);
      const data = await res.json();
      if (res.ok) {
        const uniqueData = Array.from(new Map(data.map(item => [item._id, item])).values());
        setProductState({ data: uniqueData, loading: false, error: false });
      } else throw new Error();
    } catch {
      setProductState({ data: [], loading: false, error: true });
    }
  }, [user?._id]);

  const fetchItems = useCallback(async () => {
    if (!user?._id) return;
    setItemState(prev => ({ ...prev, loading: true, error: false }));
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/items/florist/${user._id}`);
      const data = await res.json();
      if (res.ok) {
        const uniqueData = Array.from(new Map(data.map(item => [item._id, item])).values());
        setItemState({ data: uniqueData, loading: false, error: false });
      } else throw new Error();
    } catch {
      setItemState({ data: [], loading: false, error: true });
    }
  }, [user?._id]);

  useEffect(() => {
    fetchProducts();
    fetchItems();
  }, [fetchProducts, fetchItems]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery("");
    setSelectedIds([]);
  };

  const currentData = activeTab === "Buket" ? productState.data : itemState.data;
  const filteredData = currentData.filter((item) => item.Name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const displayedItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(displayedItems.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleIndividualSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const executeDelete = async (ids) => {
    showLoading("Menghapus data...");
    try {
      const folder = activeTab === "Buket" ? "products" : "items";
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/${folder}/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        showAlert("Data berhasil dihapus!");
        setSelectedIds([]);
        activeTab === "Buket" ? fetchProducts() : fetchItems();
      } else throw new Error();
    } catch {
      showAlert("Gagal menghapus data.");
    } finally {
      hideLoading();
    }
  };

  const handleSingleDelete = (id, name) => {
    showAlert({
      msg: `Hapus "${name}" dari daftar stok?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      onConfirm: () => executeDelete([id]),
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    showAlert({
      msg: `Hapus ${selectedIds.length} item terpilih?`,
      confirmText: "Hapus Semua",
      cancelText: "Batal",
      onConfirm: () => executeDelete(selectedIds),
    });
  };

  // --- LOGIKA NAVIGASI DINAMIS ---
  const handleNavigateAdd = () => {
    if (activeTab === "Buket") {
      navigate("/inventory/bouquet/add");
    } else {
      navigate("/inventory/item/add");
    }
  };

  const handleNavigateEdit = (id) => {
    if (activeTab === "Buket") {
      navigate(`/inventory/bouquet/edit/${id}`);
    } else {
      navigate(`/inventory/item/edit/${id}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="FloristDashboardContainer">
      <h1 className="FloristDashboardTitle">Stok</h1>

      <div className="FloristTabContainer">
        <button className={`FloristTabItem ${activeTab === "Buket" ? "FloristTabActive" : ""}`} onClick={() => handleTabChange("Buket")}>Buket</button>
        <button className={`FloristTabItem ${activeTab === "Item" ? "FloristTabActive" : ""}`} onClick={() => handleTabChange("Item")}>Item</button>
      </div>

      <div className="FloristOrdersTableSection">
        <div className="FloristOrdersHeader" style={{ justifyContent: 'flex-end' }}>
          <div className="FloristSearchWrapper">
            <FaSearch className="FloristSearchIcon" />
            <input type="text" placeholder={`Cari ${activeTab}...`} className="FloristSearchInput" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {((activeTab === "Buket" && productState.loading) || (activeTab === "Item" && itemState.loading)) ? <SectionLoading /> : 
         ((activeTab === "Buket" && productState.error) || (activeTab === "Item" && itemState.error)) ? <SectionError onRetry={activeTab === "Buket" ? fetchProducts : fetchItems} /> : (
          <>
            <div className="FloristTableResponsive">
              <table className="FloristMainTable">
                <thead>
                  <tr>
                    <th style={{ width: "60px", textAlign: 'center' }}>
                      <input type="checkbox" onChange={handleSelectAll} checked={displayedItems.length > 0 && selectedIds.length === displayedItems.length} />
                    </th>
                    <th className="p2 weight-semibold">Nama {activeTab}</th>
                    <th className="p2 weight-semibold">{activeTab === "Buket" ? "Rincian Komponen" : "Asset Dasar"}</th>
                    <th className="p2 weight-semibold">Harga</th>
                    <th className="p2 weight-semibold">Stok</th>
                    <th className="p2 weight-semibold" style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.length > 0 ? displayedItems.map((item) => (
                    <tr key={item._id}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleIndividualSelect(item._id)} />
                      </td>
                      <td className="p2 weight-bold">{item.Name}</td>
                      <td className="p2">
                        {activeTab === "Buket" 
                          ? item.ProductDetail?.map(d => `${d.ItemId?.Name || 'Item'} (x${d.Quantity})`).join(", ") 
                          : item.ComponentId?.Name || "-"}
                      </td>
                      <td className="p2">{formatCurrency(item.Price)}</td>
                      <td className="p2 weight-bold">{activeTab === "Buket" ? item.Quantity : item.Stok}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', cursor: 'pointer' }}>
                          <FaRegTrashAlt className="InventoryActionIcon" onClick={() => handleSingleDelete(item._id, item.Name)} />
                          
                          {/* EDIT SESUAI TAB */}
                          <FaRegEdit 
                            className="InventoryActionIcon" 
                            onClick={() => handleNavigateEdit(item._id)} 
                          />
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={{ textAlign: "center", padding: "4rem" }}>Data tidak ditemukan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="InventoryFooterContainer">
              <div className="FloristPagination">
                <button className="FloristPagArrow" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><FaChevronLeft /></button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} className={`FloristPagNum ${currentPage === i + 1 ? "FloristPagActive" : ""}`} onClick={() => setCurrentPage(i + 1)}>{String(i + 1).padStart(2, '0')}</button>
                ))}
                <button className="FloristPagArrow" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><FaChevronRight /></button>
              </div>

              <div className="InventoryActionButtons">
                <button className="InventoryBtnDelete" onClick={handleBulkDelete} disabled={selectedIds.length === 0} style={{ opacity: selectedIds.length === 0 ? 0.5 : 1 }}>
                  Hapus {selectedIds.length > 0 && `(${selectedIds.length})`}
                </button>
                
                {/* TAMBAH SESUAI TAB */}
                <button className="InventoryBtnAdd" onClick={handleNavigateAdd}>Tambah</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FloristProduct;