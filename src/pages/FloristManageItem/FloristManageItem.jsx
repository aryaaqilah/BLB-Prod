import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUpload, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { useLoading } from "../../contexts/LoadingContext";

const SectionLoading = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
    <div className="spinner"></div>
  </div>
);

const FloristManageItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const { showLoading: showGlobalLoading, hideLoading: hideGlobalLoading } = useLoading();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [formData, setFormData] = useState({
    Name: "",
    Price: "",
    Stok: "",
    ComponentId: null,
    Type: "Other" // Menambah field type
  });

  // Tentukan apakah item ini dibatasi (Wrapper/Ribbon)
  const isRestricted = formData.Type === "Wrapper" || formData.Type === "Ribbon";

  const fetchData = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const compRes = await fetch(`${process.env.REACT_APP_API_URL}/api/components`);
      const compData = await compRes.json();
      setAvailableComponents(compData);

      if (id) {
        const itemRes = await fetch(`${process.env.REACT_APP_API_URL}/api/items/${id}`);
        const itemData = await itemRes.json();
        
        if (itemRes.ok) {
          setFormData({
            Name: itemData.Name,
            Price: itemData.Price,
            Stok: itemData.Stok,
            ComponentId: itemData.ComponentId,
            Type: itemData.Type || "Other"
          });
        }
      }
    } catch (err) {
      console.error(err);
      showAlert("Gagal memuat data dari server.");
    } finally {
      setIsInitialLoading(false);
    }
  }, [id, showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.Name || !formData.Price || !formData.Stok) {
      return showAlert("Mohon lengkapi Nama, Harga, dan Stok item.");
    }

    showGlobalLoading("Menyimpan perubahan...");
    const method = id ? "PUT" : "POST";
    const url = id ? `${process.env.REACT_APP_API_URL}/api/items/${id}` : `${process.env.REACT_APP_API_URL}/api/items`;

    const payload = {
      ...formData,
      ComponentId: formData.ComponentId?._id || null,
      ShopId: user?._id,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showAlert(id ? "Item berhasil diperbarui!" : "Item baru berhasil ditambahkan!");
        navigate("/inventory");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
    } catch (err) {
      showAlert("Gagal menyimpan: " + err.message);
    } finally {
      hideGlobalLoading();
    }
  };

  return (
    <div className="FloristManageItemContainer">
      <button className="TernaryBackButton" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>

      <h2 className="FloristManageItemTitle">
        {id ? `Edit Item #${id.substring(id.length - 5).toUpperCase()}` : "Tambah Item Baru"}
      </h2>

      {isInitialLoading ? (
        <SectionLoading />
      ) : (
        <div className="FloristManageItemFormSection">
          
          {/* PERINGATAN JIKA ITEM RESTRICTED */}
          {isRestricted && (
            <div className="FloristRestrictedNotice">
              <FaExclamationTriangle />
              <span>Item kustomisasi (Wrapper/Pita) hanya dapat diubah <b>Stoknya</b> saja di sini. Untuk mengubah Nama/Warna, silakan melalui menu <b>Kustomisasi</b>.</span>
            </div>
          )}

          <div className="FloristManageItemInputGroup">
            <label>Nama Item</label>
            <input
              type="text"
              name="Name"
              value={formData.Name}
              onChange={handleInputChange}
              readOnly={isRestricted}
              placeholder="Nama bunga atau aksesoris..."
              className={isRestricted ? "InputDisabled" : ""}
            />
          </div>

          <div className="FloristManageItemInputGroup">
            <label>Asset 3D Item (Pilih Komponen)</label>
            <select
              className={`FloristAssetDropdown ${isRestricted ? "InputDisabled" : ""}`}
              value={formData.ComponentId?._id || ""}
              disabled={isRestricted}
              onChange={(e) => {
                const selected = availableComponents.find((c) => c._id === e.target.value);
                setFormData((prev) => ({ ...prev, ComponentId: selected || null }));
              }}
            >
              <option value="">-- Pilih Asset 3D --</option>
              {availableComponents.map((comp) => (
                <option key={comp._id} value={comp._id}>{comp.Name}</option>
              ))}
            </select>

            {formData.ComponentId && (
              <div className="FloristSelectedAssetPreview">
                <div className="PreviewImageFrame">
                  <img
                    src={`${process.env.REACT_APP_API_URL}${formData.ComponentId.Image}`}
                    alt="Preview"
                    onError={(e) => (e.target.src = "https://via.placeholder.com/100?text=No+Image")}
                  />
                </div>
                <div className="PreviewInfo">
                  <p className="weight-bold">{formData.ComponentId.Name}</p>
                  <p className="p3">Asset ini muncul di Customizer 3D</p>
                </div>
                {!isRestricted && (
                  <button
                    className="RemoveAssetBtn"
                    onClick={() => setFormData((prev) => ({ ...prev, ComponentId: null }))}
                  >
                    Batal Pilih
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="FloristManageItemRow">
            <div className="FloristManageItemInputGroup">
              <label>Harga Satuan</label>
              <input 
                type="number" 
                name="Price" 
                value={formData.Price} 
                onChange={handleInputChange} 
                readOnly={isRestricted}
                placeholder="Rp" 
                className={isRestricted ? "InputDisabled" : ""}
              />
            </div>
            <div className="FloristManageItemInputGroup">
              <label>Stok (Dapat Diubah)</label>
              <input 
                type="number" 
                name="Stok" 
                value={formData.Stok} 
                onChange={handleInputChange} 
                placeholder="0" 
              />
            </div>
          </div>

          <div className="FloristManageItemAction">
            <button className="FloristManageItemSubmitBtn" onClick={handleSave}>
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloristManageItem;