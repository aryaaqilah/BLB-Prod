import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUpload, FaTrash } from "react-icons/fa";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { useLoading } from "../../contexts/LoadingContext";

const SectionLoading = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
    <div className="spinner"></div>
  </div>
);

const FloristManageBouquet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const { showLoading, hideLoading } = useLoading();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [availableItems, setAvailableItems] = useState([]);
  const [formData, setFormData] = useState({
    Name: "",
    Price: 0,
    Quantity: "",
    Memo: "",
    Image: null,
    PreviewImage: null,
    ProductDetail: [],
  });

  const calculateTotalPrice = useCallback(
    (details) => {
      return details.reduce((sum, current) => {
        const itemData = availableItems.find((i) => i._id === current.ItemId);
        return sum + (itemData?.Price || 0) * current.Quantity;
      }, 0);
    },
    [availableItems],
  );

  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    setIsInitialLoading(true);
    try {
      const itemsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/items/florist/${user._id}`);
      const itemsData = await itemsRes.json();
      setAvailableItems(itemsData);

      if (id) {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/products/${id}`);
        const data = await res.json();
        if (res.ok) {
          setFormData({
            Name: data.Name,
            Price: data.Price,
            Quantity: data.Quantity,
            Memo: data.Memo || "",
            // PERBAIKAN: Simpan path mentah saja dari DB
            PreviewImage: data.Image, 
            Image: null,
            ProductDetail: data.ProductDetail.map((d) => ({
              ItemId: d.ItemId?._id || d.ItemId,
              Name: d.ItemId?.Name || "Item",
              Quantity: d.Quantity,
            })),
          });
        }
      }
    } catch (err) {
      showAlert("Gagal mengambil data.");
    } finally {
      setIsInitialLoading(false);
    }
  }, [id, user?._id, showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const total = calculateTotalPrice(formData.ProductDetail);
    setFormData((prev) => ({ ...prev, Price: total }));
  }, [formData.ProductDetail, calculateTotalPrice]);

  const handleAddItem = (itemId) => {
    const item = availableItems.find((i) => i._id === itemId);
    if (formData.ProductDetail.find((d) => d.ItemId === itemId))
      return showAlert("Item sudah ada.");
    setFormData((prev) => ({
      ...prev,
      ProductDetail: [
        ...prev.ProductDetail,
        { ItemId: itemId, Name: item.Name, Quantity: 1 },
      ],
    }));
  };

  const handleSave = async () => {
    if (!formData.Name || formData.ProductDetail.length === 0)
      return showAlert("Lengkapi data!");

    showLoading("Menyimpan...");
    const data = new FormData();
    data.append("Name", formData.Name);
    data.append("Price", formData.Price);
    data.append("Quantity", formData.Quantity);
    data.append("Memo", formData.Memo);
    data.append("ShopId", user._id);
    data.append("IsCustomized", 0);

    const simplifiedDetails = formData.ProductDetail.map((d) => ({
      ItemId: d.ItemId,
      Quantity: d.Quantity,
    }));
    data.append("ProductDetail", JSON.stringify(simplifiedDetails));

    if (formData.Image) data.append("Image", formData.Image);

    const url = id ? `${process.env.REACT_APP_API_URL}/api/products/${id}` : `${process.env.REACT_APP_API_URL}/api/products`;
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, body: data });
      if (res.ok) {
        showAlert(id ? "Buket diperbarui!" : "Buket ditambahkan!");
        navigate("/inventory");
      } else {
        const errData = await res.json();
        showAlert("Gagal: " + errData.error);
      }
    } catch {
      showAlert("Terjadi kesalahan koneksi.");
    } finally {
      hideLoading();
    }
  };

  // Helper untuk menentukan URL gambar yang benar
  const getDisplayImage = () => {
    if (!formData.PreviewImage) return null;
    // Jika itu blob (baru upload) atau base64, gunakan langsung
    if (formData.PreviewImage.startsWith("blob:") || formData.PreviewImage.startsWith("data:")) {
      return formData.PreviewImage;
    }
    // Jika itu path dari server (misal: /uploads/...)
    return `${process.env.REACT_APP_API_URL}${formData.PreviewImage}`;
  };

  return (
    <div className="FloristManageBouquetContainer">
      <button className="TernaryBackButton" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>
      <h2 className="FloristManageBouquetTitle">
        {id ? `Edit Buket #${id.substring(id.length - 5).toUpperCase()}` : "Tambah Buket Baru"}
      </h2>

      {isInitialLoading ? (
        <SectionLoading />
      ) : (
        <div className="FloristManageBouquetForm">
          <div className="FloristInputGroup">
            <label>Nama Produk</label>
            <input
              type="text"
              value={formData.Name}
              onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
              placeholder="Nama Buket..."
            />
          </div>

          <div className="FloristInputGroup">
            <label>Foto Produk</label>
            <div
              className="FloristImageUploader"
              onClick={() => document.getElementById("fileInput").click()}
            >
              {formData.PreviewImage ? (
                <img
                  src={getDisplayImage()}
                  className="PreviewImg"
                  alt="Preview"
                  onError={(e) => (e.target.src = "https://via.placeholder.com/300?text=Error+Loading+Image")}
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <FaUpload style={{ fontSize: '2rem', color: '#A65E4E' }} />
                  <p className="p3">Klik untuk Upload Foto</p>
                </div>
              )}
              <input
                type="file"
                id="fileInput"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file)
                    setFormData({
                      ...formData,
                      Image: file,
                      PreviewImage: URL.createObjectURL(file),
                    });
                }}
                accept="image/*"
              />
            </div>
          </div>

          <div className="FloristInputGroup">
            <label>Item Penyusun</label>
            <div className="SelectedItemsList">
              {formData.ProductDetail.map((item, index) => (
                <div key={index} className="ItemRow">
                  <span>{item.Name}</span>
                  <div className="ItemActions">
                    <input
                      type="number"
                      value={item.Quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ProductDetail: formData.ProductDetail.map((d) =>
                            d.ItemId === item.ItemId
                              ? { ...d, Quantity: parseInt(e.target.value) || 0 }
                              : d
                          ),
                        })
                      }
                    />
                    <FaTrash
                      className="DeleteIcon"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          ProductDetail: formData.ProductDetail.filter((d) => d.ItemId !== item.ItemId),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <select
              className="FloristItemDropdown"
              onChange={(e) => handleAddItem(e.target.value)}
              value=""
            >
              <option value="" disabled>+ Tambah Item dari Stok</option>
              {availableItems
                .filter((ai) => !formData.ProductDetail.find((pd) => pd.ItemId === ai._id))
                .map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.Name} (Rp {i.Price.toLocaleString()})
                  </option>
                ))}
            </select>
          </div>

          <div className="FloristManageBouquetRow">
            <div className="FloristInputGroup">
              <label>Harga Jual (Auto)</label>
              <div className="AutoPriceBox">
                Rp {formData.Price.toLocaleString("id-ID")}
              </div>
            </div>
            <div className="FloristInputGroup">
              <label>Stok Produk</label>
              <input
                type="number"
                value={formData.Quantity}
                onChange={(e) => setFormData({ ...formData, Quantity: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="FloristInputGroup">
            <label>Deskripsi / Memo</label>
            <textarea 
              value={formData.Memo} 
              onChange={e => setFormData({...formData, Memo: e.target.value})} 
              placeholder="Tuliskan deskripsi produk..." 
              style={{ minHeight: '100px' }}
            />
          </div>

          <div className="FloristActionCenter">
            <button className="FloristSubmitBtn" onClick={handleSave}>
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloristManageBouquet;