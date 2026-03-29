import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { useLoading } from "../../contexts/LoadingContext";
import { FaPlus, FaTrash, FaArrowLeft } from "react-icons/fa";

const SectionLoading = () => (
  <div className="CustomizationLoadingContainer">
    <div className="spinner"></div>
  </div>
);

const FloristCustomization = () => {
  const { user } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const { showLoading, hideLoading } = useLoading();
  const navigate = useNavigate();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [accept, setAccept] = useState(false);
  const [wrappers, setWrappers] = useState([]);
  const [ribbons, setRibbons] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    try {
      const itemRes = await fetch(`${process.env.REACT_APP_API_URL}/api/items/florist/${user._id}`);
      const itemData = await itemRes.json();

      const filterByType = (type) =>
        itemData
          .filter((i) => i.Type === type)
          .map((i) => ({
            hex: i.HexCode || "#ffffff",
            label: i.Name.replace(type === "Wrapper" ? "Wrapper " : "Pita ", ""),
            price: i.Price,
            stok: i.Stok,
          }));

      const existingWrappers = filterByType("Wrapper");
      const existingRibbons = filterByType("Ribbon");

      setWrappers(existingWrappers);
      setRibbons(existingRibbons);

      if (existingWrappers.length > 0 || existingRibbons.length > 0) {
        setAccept(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItemRow = (type) => {
    const newItem = { hex: "#a55749", label: "", price: 0, stok: 0 };
    if (type === "W") setWrappers([...wrappers, newItem]);
    else setRibbons([...ribbons, newItem]);
  };

  const updateField = (type, index, field, value) => {
    const list = type === "W" ? [...wrappers] : [...ribbons];
    list[index][field] = value;
    type === "W" ? setWrappers(list) : setRibbons(list);
  };

  const handleSave = async () => {
    if (accept && (wrappers.length === 0 || ribbons.length === 0)) {
      return showAlert("Minimal harus ada 1 Wrapper dan 1 Pita!");
    }

    showLoading("Menyinkronkan data kustomisasi...");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/items/customization/${user._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accept, wrappers, ribbons }),
        }
      );

      const responseData = await res.json();

      if (res.ok) {
        showAlert("Berhasil memperbaharui data kustomisasi.");
      } else {
        showAlert("Gagal menyimpan data kustomisasi, silahkan coba lagi.");
      }
    } catch (err) {
      showAlert("Oops... terjadi kesalahan silakan coba lagi");
    } finally {
      hideLoading();
    }
  };

  const renderEntry = (item, index, type) => {
    return (
      <div key={index} className="CustomizationEntryRow">
        <div className="CustomizationEntryHeader">
          <div className="CustomizationInputBox">
            <label className="CustomizationTinyLabel">Warna</label>
            <input
              type="color"
              value={item.hex}
              onChange={(e) => updateField(type, index, "hex", e.target.value)}
              className="CustomizationColorPicker"
            />
          </div>
          <div className="CustomizationHexDisplay">
            <span className="p3">{item.hex.toUpperCase()}</span>
          </div>
        </div>

        <div className="CustomizationEntryContent">
          <div className="CustomizationInputBox FlexGrow3">
            <label className="CustomizationTinyLabel">Nama Item</label>
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateField(type, index, "label", e.target.value)}
              className="CustomizationTextField"
              placeholder="Masukkan keterangan warna..."
            />
          </div>
          <div className="CustomizationInputBox">
            <label className="CustomizationTinyLabel">Harga</label>
            <input
              type="number"
              value={item.price}
              onChange={(e) => updateField(type, index, "price", e.target.value)}
              className="CustomizationNumberField"
            />
          </div>
          <div className="CustomizationInputBox">
            <label className="CustomizationTinyLabel">Stok</label>
            <input
              type="number"
              value={item.stok}
              onChange={(e) => updateField(type, index, "stok", e.target.value)}
              className="CustomizationNumberField"
            />
          </div>
          <div className="CustomizationDeleteArea">
            <FaTrash
              className="CustomizationTrashIcon"
              onClick={() => {
                const list = type === "W" ? wrappers.filter((_, i) => i !== index) : ribbons.filter((_, i) => i !== index);
                type === "W" ? setWrappers(list) : setRibbons(list);
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="CustomizationMainContainer">
      <button className="TernaryBackButton" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>
      <h1 className="FloristDashboardTitle">Kustomisasi Toko</h1>

      {isInitialLoading ? (
        <SectionLoading />
      ) : (
        <div className="CustomizationMasterCard">
          <div className="CustomizationStatusRow">
            <span className="CustomizationFixedLabel">Terima Kustomisasi</span>
            <div className="CustomizationStatusValue">
              <select
                className="CustomizationStatusSelect"
                value={accept}
                onChange={(e) => setAccept(e.target.value === "true")}
              >
                <option value="false">Tidak, Hanya Produk Katalog</option>
                <option value="true">Ya, Aktifkan Pesanan Kustom</option>
              </select>
            </div>
          </div>

          {accept && (
            <>
              <div className="CustomizationGroupBlock">
                <h3 className="h3 txt-color-primary">Daftar Pilihan Kertas / Wrapper</h3>
                {wrappers.map((w, i) => renderEntry(w, i, "W"))}
                <button className="CustomizationAddBtn" onClick={() => addItemRow("W")}>
                  <FaPlus /> Tambah Item Wrapper
                </button>
              </div>

              <div className="CustomizationGroupBlock">
                <h3 className="h3 txt-color-primary">Daftar Pilihan Pita / Ribbon</h3>
                {ribbons.map((r, i) => renderEntry(r, i, "R"))}
                <button className="CustomizationAddBtn" onClick={() => addItemRow("R")}>
                  <FaPlus /> Tambah Item Pita
                </button>
              </div>
            </>
          )}

          <div className="CustomizationFooter">
            <button className="CustomizationSubmitBtn" onClick={handleSave}>
              Simpan Pengaturan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloristCustomization;