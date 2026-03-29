import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { get as getDb } from "idb-keyval";

function AddressSection({ selectedProduct, modelData, provinceData, cityData, districtData }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const handleGoBack = () => window.history.back();

  const [addressData, setAddressData] = useState({
    RecipientName: "",
    RecipientEmail: "",
    RecipientNumber: "",
    ProvinceId: "",
    CityId: "",
    DistrictId: "",
    PostalCodeId: "",
    Detail: "",
    Note: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = (e) => {
    e.preventDefault();

    const {
      RecipientName,
      RecipientNumber,
      ProvinceId,
      CityId,
      DistrictId,
      PostalCodeId,
      Detail,
    } = addressData;

    if (
      !RecipientName ||
      !RecipientNumber ||
      !ProvinceId ||
      !CityId ||
      !DistrictId ||
      !PostalCodeId ||
      !Detail
    ) {
      showAlert("Mohon lengkapi semua data alamat yang bertanda wajib!");
      return;
    }

    if (user) {
      navigate("/payment", {
        state: { selectedProduct, addressData, modelData },
      });
    } else {
      showAlert("Silakan login terlebih dahulu untuk melakukan pembelian.");
      navigate("/login");
    }
  };

  return (
    <section className="AddressSection">
      <div className="AddressSectionContainer">
        <div className="Confirmation-Back-Container" style={{ display : "flex", justifyContent : "flex-start", alignItems : "center", width : "100%", height : "10px" }}>
            <button className="TernaryBackButton" onClick={handleGoBack}>
            ←
            </button>
          </div>
        <h1 className="txt-color-primary">Alamat Pengiriman</h1>

        <div className="AddressBox txt-color-ternary">
          <form onSubmit={handleCheckout} className="AddressFormGrid">
            {/* Column 1: Contact Info */}
            <div className="FormColumn">
              <div className="AddressFormGroup">
                <label>Nama Penerima</label>
                <input
                  type="text"
                  name="RecipientName"
                  value={addressData.RecipientName}
                  onChange={handleChange}
                  placeholder="Masukkan nama penerima"
                />
              </div>

              <div className="AddressFormGroup">
                <label>Email Penerima</label>
                <input
                  type="email"
                  name="RecipientEmail"
                  value={addressData.RecipientEmail}
                  onChange={handleChange}
                  placeholder="Masukkan email penerima"
                />
              </div>

              <div className="AddressFormGroup">
                <label>Nomor Telepon Penerima</label>
                <input
                  type="number"
                  name="RecipientNumber"
                  value={addressData.RecipientNumber}
                  onChange={handleChange}
                  placeholder="Masukkan nomor telepon"
                />
              </div>
            </div>

            {/* Column 2: Regional Info */}
            <div className="FormColumn">
              <div className="AddressFormGroup">
                <label>Provinsi</label>
                <select
                  name="ProvinceId"
                  value={addressData.ProvinceId}
                  onChange={handleChange}
                  className="AddressSelect" // Tambahkan styling jika perlu
                >
                  <option value="">-- Pilih Provinsi --</option>
                  {provinceData.map((prov) => (
                    <option key={prov._id} value={prov._id}>
                      {prov.provinsi_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="AddressFormGroup">
                <label>Kota/Kabupaten</label>
                <select
                  name="CityId"
                  value={addressData.CityId}
                  onChange={handleChange}
                  disabled={!addressData.ProvinceId} // Disable jika provinsi belum dipilih
                  className="AddressSelect"
                >
                  <option value="">Pilih Kota</option>
                  {cityData
                    .filter((city) => city.provinsi_id._id === addressData.ProvinceId)
                    .map((city) => (
                      <option key={city._id} value={city._id}>
                        {city.city_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="AddressFormGroup">
                <label>Kecamatan/Kelurahan</label>
                <select
                  name="DistrictId"
                  value={addressData.DistrictId}
                  onChange={handleChange}
                  disabled={!addressData.CityId} // Disable jika provinsi belum dipilih
                  className="AddressSelect"
                >
                  <option value="">Pilih Kota</option>
                  {districtData
                    .filter((district) => district.city_id._id === addressData.CityId)
                    .map((district) => (
                      <option key={district._id} value={district._id}>
                        {district.district_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="AddressFormGroup">
                <label>Kode Pos</label>
                <input
                  type="text"
                  name="PostalCodeId"
                  value={addressData.PostalCodeId}
                  onChange={handleChange}
                  placeholder="Masukkan kode pos"
                />
              </div>
            </div>

            {/* Column 3: Detail & Notes */}
            <div className="FormColumn">
              <div className="AddressFormGroup">
                <label>Alamat Lengkap</label>
                <textarea
                  name="Detail"
                  value={addressData.Detail}
                  onChange={handleChange}
                  placeholder="Contoh: Jl. Mawar No. 123, RT 01/02"
                />
              </div>
              <div className="AddressFormGroup">
                <label>Catatan (Opsional)</label>
                <textarea
                  name="Note"
                  value={addressData.Note}
                  onChange={handleChange}
                  placeholder="Contoh: Pagar warna hitam"
                />
              </div>
            </div>

            {/* Center Button */}
            <div className="AddressButtonContainer" style={{ gap : 30 }}>
              {/* <button type="submit" className="button-ternary" onClick={handleGoBack}>
                Kembali 
              </button> */}
              <button type="submit" className="button-ternary">
                Lanjut ke Pembayaran
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function Address() {
  const { showAlert } = useAlert();
  const location = useLocation();
  const productInfo = location.state?.selectedProduct;

    const navigate = useNavigate();
    useEffect(() => {
      if (!productInfo) {
        showAlert("Data produk tidak ditemukan. Silahkan ulangi dari awal.");
  
        navigate("/profile", { replace: true });
      }
    }, [productInfo, navigate]);

  const [modelData, setModelData] = useState(null);
  const [provinceData, setProvinceData] = useState([]);
  const [cityData, setCityData] = useState([]);
  const [districtData, setDistrictData] = useState([]);

  useEffect(() => {
    const loadModel = async () => {
      const data = await getDb("pending_order_model");
      if (data) setModelData(data);
    };
    loadModel();
  }, []);

  const API_URL_PROVINCE = "${process.env.REACT_APP_API_URL}/api/provinces";
  const API_URL_CITY = "${process.env.REACT_APP_API_URL}/api/cities";
  const API_URL_DISTRICT = "${process.env.REACT_APP_API_URL}/api/districts";
    const handleProvince = async (e) => {
      try {
        const response = await fetch(API_URL_PROVINCE, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        // const latestData = data.reverse().slice(0, 3);
        setProvinceData(data);
        console.log(data);
        console.log("Fetch successful");
      } catch (error) {
        console.log("Error:", error);
      } finally {
      }
    };

    const handleCity = async (e) => {
      try {
        const response = await fetch(API_URL_CITY, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        // const latestData = data.reverse().slice(0, 3);
        setCityData(data);
        console.log(data);
        console.log("Fetch successful");
      } catch (error) {
        console.log("Error:", error);
      } finally {
      }
    };

    const handleDistrict = async (e) => {
      try {
        const response = await fetch(API_URL_DISTRICT, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        // const latestData = data.reverse().slice(0, 3);
        setDistrictData(data);
        console.log(data);
        console.log("Fetch successful");
      } catch (error) {
        console.log("Error:", error);
      } finally {
      }
    };
  
    useEffect(() => {
      handleProvince();
      handleCity();
      handleDistrict();
    }, []);

  return <AddressSection selectedProduct={productInfo} modelData={modelData} provinceData={provinceData} cityData={cityData} districtData={districtData} />;
}
