import CardSet from "../../components/Card/CardSet";
import { useEffect, useState } from "react";
import { CardModel } from "../../models/CardModel";
import { useNavigate } from "react-router-dom";
import ProductCard from "../../components/ProductCard/ProductCard";
import StoreCard from "../../components/StoreCard/StoreCard";

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

function MostPopularSection({ state, onRetry }) {
  const navigate = useNavigate();

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
        <CardSet 
          cards={state.data.map(p => new CardModel(p._id, p.Name, p.Price, p.Memo, p.Image, false))} 
          navigate={navigate} 
        />
      )}
    </section>
  );
}

function StoreSection({ state, onRetry }) {
  const navigate = useNavigate();

  return (
    <section className="ShopProductSection">
      <div className="ShopProductSectionTitle">
        <h1 className="txt-color-primary">Toko</h1>
        <h3 className="txt-color-ternary">Menyediakan yang terbaik untuk Anda</h3>
      </div>

      {state.loading ? (
        <SectionLoading />
      ) : state.error ? (
        <SectionError onRetry={onRetry} />
      ) : (
        <div className="product-grid">
          {state.data?.map((shop) => (
            <StoreCard 
              key={shop._id} 
              store={{ id: shop._id, name: shop.Name, logo: shop.Logo }}
              onSelect={(s) => navigate(`/store/${s.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Shop() {
  const [productState, setProductState] = useState({ data: [], loading: true, error: false });
  const [shopState, setShopState] = useState({ data: [], loading: true, error: false });

  const fetchProducts = async () => {
    setProductState(prev => ({ ...prev, loading: true, error: false }));
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products/best-sellers`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      console.log("Fetched products:", data);
      setProductState({ data: data.reverse().slice(0, 4), loading: false, error: false });
    } catch (error) {
      setProductState({ data: [], loading: false, error: true });
    }
  };

  const fetchShops = async () => {
    setShopState(prev => ({ ...prev, loading: true, error: false }));
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/shops`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setShopState({ data, loading: false, error: false });
    } catch (error) {
      setShopState({ data: [], loading: false, error: true });
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchShops();
  }, []);

  return (
    <div>
      <MostPopularSection state={productState} onRetry={fetchProducts} />
      <StoreSection state={shopState} onRetry={fetchShops} />
    </div>
  );
}