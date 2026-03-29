import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductCard from "../../components/ProductCard/ProductCard";
import { FaArrowLeft, FaStar } from "react-icons/fa";
import { useLoading } from "../../contexts/LoadingContext";
import { CardModel } from "../../models/CardModel";
import { StoreCardModel } from "../../models/StoreCardModel";

const dummyStores = [
  new StoreCardModel("1", "HER.ROSES Florist", "https://i.ibb.co/LzY8v1C/Logo-Placeholder.png"),
  new StoreCardModel("2", "FLORA.STUDIO", "https://i.ibb.co/LzY8v1C/Logo-Placeholder.png"),
];

const dummyProducts = [
  new CardModel("p1", "Buket Diah", "150", "Lorem ipsum dolor sit amet, consectetur adipiscing.", "https://via.placeholder.com/300", false),
  new CardModel("p2", "Mawar Putih", "200", "Simbol kesucian untuk yang terkasih.", "https://via.placeholder.com/300", false),
  new CardModel("p3", "Red Tulip", "180", "Keindahan tulip merah segar.", "https://via.placeholder.com/300", false),
];

const ShopLanding = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const [storeInfo, setStoreInfo] = useState(null);
  const [addressInfo, setAddressInfo] = useState([]);
  const [products, setProducts] = useState([]);
  const [ratingState, setRatingState] = useState({ data: [], loading: true, error: false });
  const [totalRating, setTotalRating] = useState(0);

  // const getGroupedSummary = () => {
  //   // Buat rincian berdasarkan data master di state 'components'
  //   return components.map((comp) => {
  //     // Hitung berapa banyak objek ini ada di canvas berdasarkan modelPath
  //     const count = objects.filter((obj) => obj.modelPath === comp.Asset).length;
  //     const subTotal = count * (comp.Price || 0);

  //     let tempId = ""

  //     return {
  //       name: comp.Name,
  //       qty: count,
  //       price: subTotal,
  //       ItemId : comp.ItemId
  //     };
  //   });
  // };

  // const summaryData = getGroupedSummary();

  const itemFormatting = (item) => {
    return item.map(item => ({ItemId : item.ItemId, Quantity : item.qty}));
  }

  const fetchData = async () => {
      showLoading("Menyiapkan data florist...");

      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/shops/${storeId}`
        );
        const dataShop = await response.json();

        console.log("ini abis hit shop");
        console.log(dataShop);
        setStoreInfo(dataShop);

        // SECTION GET PROVINCE, CITY, DISTRICT =========================================================================
        const response2 = await fetch(
          `${process.env.REACT_APP_API_URL}/api/provinces/${dataShop.Address.ProvinceId}`
        );
        if (!response.ok) {
          throw new Error("Gagal mengambil data provinsi");
        }
        const dataProv = await response2.json();

        const response3 = await fetch(
          `${process.env.REACT_APP_API_URL}/api/cities/${dataShop.Address.CityId}`
        );
        if (!response2.ok) {
          throw new Error("Gagal mengambil data kota");
        }
        const dataCity = await response3.json();
        console.log("Hasil pencarian:", dataProv);

        const response4 = await fetch(
          `${process.env.REACT_APP_API_URL}/api/districts/${dataShop.Address.DistrictId}`
        );
        if (!response3.ok) {
          throw new Error("Gagal mengambil data kecamatan");
        }
        const dataDistrict = await response4.json();

        console.log("Hasil pencarian:", dataProv);
        console.log("Hasil pencarian:", dataCity);
        console.log("Hasil pencarian:", dataDistrict);

        const addressData = {
          province: dataProv.provinsi_name,
          city: dataCity.city_name,
          district: dataDistrict.district_name
        }

        setAddressInfo(addressData);

        console.log("infooo ", addressInfo);

        
      } catch (error) {
        console.error("❌ Error fetching data:", error);
      }
    };
    const fetchRatings = async () => {
      setRatingState(prev => ({ ...prev, loading: true, error: false }));
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/ratings/florist/${storeId}`);
        const data = await res.json();
        if (res.ok) {
          const uniqueRatings = Array.from(new Map(data.map(item => [item._id, item])).values());
          setRatingState({ data: uniqueRatings, loading: false, error: false });
          setTotalRating(uniqueRatings.length > 0 ? (uniqueRatings.length) : 0);
        } else throw new Error();
      } catch {
        setRatingState({ data: [], loading: false, error: true });
      }
    }

    const fetchProducts = async () => {
      const responseProduct = await fetch(
            `${process.env.REACT_APP_API_URL}/api/products/shop/${storeId}`
          );
        const dataProduct = await responseProduct.json();

        console.log("ini abis hit shop");
        console.log(dataProduct);
        console.log("ini data storeInfo", storeInfo);
        const objects = dataProduct.map((item) => ({
          key : item._id,
          title : item.Name,
          price : item.Price,
          description : item.Memo,
          image : item.Image,
          truefalse : false,
          ShopId : storeId,
          items : Array.isArray(item.ProductDetail)
              ? item.ProductDetail.map((i) => ({
                  ItemId: i._id,
                  Quantity: i.Quantity,
                  ItemStokId : i.ItemId._id,
                  ItemName : i.ItemId ? i.ItemId.Name : "Unknown Item"
                }))
              : []
        }));
        setProducts(objects);
        console.log(products);
    }

  useEffect(() => {
    showLoading("Menghubungi penjual...");
    
    fetchData();
    fetchProducts();
    fetchRatings();

    const timer = setTimeout(() => {
      // Logic Fix: If storeId is not found, use dummyStores[0] for testing purposes
      
      const selectedStore = dummyStores.find((s) => s._id === storeId) || dummyStores[0];
      
      // setStoreInfo(selectedStore);
      // setProducts(dummyProducts);
      
      hideLoading();
    }, 500);

    return () => clearTimeout(timer);
  }, [storeId]);

  // Prevent returning null; show a skeleton or return a fragment instead
  if (!storeInfo) return <div style={{ height: '100vh' }}></div>;

  const handleCustom = () => {
    navigate('/customizer', { state: { storeId : storeId } });
  }

  const SectionError = ({ onRetry }) => (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p className="p1 txt-color-ternary" style={{ marginBottom: '1rem' }}>
        Oops... terjadi kesalahan, silakan coba lagi.
      </p>
      <button className="rounded-button-primary" onClick={onRetry}>
        Coba Lagi
      </button>
    </div>
  );

  const SectionLoading = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner"></div>
    </div>
  );

  function ProductSection({ state, onRetry }) {
    // const navigate = useNavigate();

    return (
      <section className="ShopMostPopularSection">
        <div className="ShopMostPopularDescription">
          <h1 className="txt-color-primary">Ukir Kisah Cintamu</h1>
          <h3 className="txt-color-ternary">Yang terbaik untuk yang terkasih</h3>
        </div>

        {state.loading ? (
          <SectionLoading />
        ) : state.error ? (
          <SectionError onRetry={onRetry} />
        ) : (
          <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8rem 2rem' }}>
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onSelect={(p) => navigate('/confirmation', { state: { selectedProduct: p }})} 
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="ShopLandingContainer" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button className="TernaryBackButton" onClick={() => navigate(-1)} style={{ marginBottom: '2rem' }}>
        <FaArrowLeft />
      </button>
      
      <header className="ShopLandingHeader" style={{ display: 'flex', alignItems: 'center', gap: '2rem', borderBottom: '1px solid #eee', paddingBottom: '2rem', marginBottom: '3rem' }}>
        <img src={storeInfo.Logo} alt={storeInfo.Name} className="ShopLandingLogo" style={{ width: '120px', height: '120px', borderRadius: '50%' }} />
        <div className="ShopLandingDetails" style={{ width : '100%' }}>
          <h1 className="h1 txt-color-primary">{storeInfo.Name}</h1>
          <p className="p2">Alamat: {addressInfo.city}, {addressInfo.province} </p>
          <p className="p2">No. Telepon: {storeInfo.PhoneNumber}</p>
          <div className="ShopLandingRatingRow" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', justifyContent: 'space-between'  }}>
            <div style={{ display: 'flex', alignItems: 'center',gap: '8px' }}><FaStar color="#FFD700" /> 
            <span className="p2 weight-semibold">{ratingState.data.length > 0 ? (ratingState.data.reduce((a, b) => a + b.Rating, 0) / ratingState.data.length).toFixed(1) : "0"}</span>
            <span className="p3 txt-color-bg-dark">({totalRating} ulasan)</span></div>
            <div>
              <button className="button-primary-fill" onClick={handleCustom} >Kreasikan Buket Mu</button>
            </div>
          </div>
        </div>
      </header>

      <section className="ShopLandingProductSection">
        <div className="ShopLandingProductTitle" style={{ marginBottom: '6rem' }}>
          <h2 className="h2">Produk Kami</h2>
          <p className="p2">Yang terbaik untuk yang terkasih</p>
        </div>
        
        <ProductSection state={products} onRetry={fetchProducts} />

      </section>
    </div>
  );
};

export default ShopLanding;