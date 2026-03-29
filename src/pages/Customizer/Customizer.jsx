import LilyImage from '../../assets/png/lilly.png';
import TulipImage from '../../assets/png/tulip.png';
import RoseImage from '../../assets/png/rose.png';
import WrapperImage from '../../assets/png/wrapper.png';
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OrbitControls, Text, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { set as setDb, get as getDb, del as delDb } from 'idb-keyval';
import { useNavigate } from 'react-router-dom';
import { useAlert } from "../../contexts/AlertContext";
import { useLoading } from "../../contexts/LoadingContext";
import { FaCamera, FaTrash } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate, faHand } from "@fortawesome/free-solid-svg-icons";

<script src="https://kit.fontawesome.com/4700816e81.js" crossorigin="anonymous"></script>
const ALLOWED_COLORS = [
  "#000000", // Hitam
  "#ffffff", // Putih
  "#f4cb9e", // Krem/Peach
  "#fca1b6", // Pink
  "#8fd9fa", // Biru Muda
];

function Object3DModel({
  id,
  modelPath,
  position,
  mode,
  setDragging,
  type,
  color,
  text,
  isSelected,
  onSelect,
  parcelColor,
  ribbonColor,
}) {
  const { scene } = useGLTF(modelPath);
  const modelRef = useRef();
  const { camera, gl } = useThree();

  // ✅ Clone dan atur warna, tanpa shadow
  useEffect(() => {
    if (!scene || !modelRef.current) return;
    const cloned = scene.clone(true);

    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    if (type === "flower") {
      if (modelPath.includes("tulip")) cloned.scale.set(0.15, 0.15, 0.15);
      else if (modelPath.includes("rose")) cloned.scale.set(1.1, 1.1, 1.1);
      else if (modelPath.includes("lilly")) cloned.scale.set(1.5, 1.5, 1.5);
      else cloned.scale.set(0.5, 0.5, 0.5);
    }
    if (type === "Wrapper") cloned.scale.set(2.0, 2.0, 2.0);
    if (type === "card") cloned.scale.set(0.3, 0.3, 0.3);

    // 🎨 Warna parcel & ribbon
    if (type === "Wrapper") {
      const parcels = cloned.getObjectByName("Parcels");
      const ribbon = cloned.getObjectByName("Ribbon");

      if (parcels) {
        parcels.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color = new THREE.Color(parcelColor || "#ffffff");
          }
        });
      }

      if (ribbon) {
        ribbon.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color = new THREE.Color(ribbonColor || "#ff0000");
          }
        });
      }
    } else if (type === "card" && color) {
      cloned.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color = new THREE.Color(color);
        }
      });
    }

    modelRef.current.clear && modelRef.current.clear();
    while (modelRef.current.children.length)
      modelRef.current.remove(modelRef.current.children[0]);
    modelRef.current.add(cloned);
  }, [scene, type, modelPath, parcelColor, ribbonColor, color]);

  // 🔹 Highlight objek terpilih
  useEffect(() => {
    if (!modelRef.current) return;
    modelRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(
          isSelected ? 0x00ff00 : 0x000000
        );
      }
    });
  }, [isSelected]);

  // 🔹 Seleksi objek dengan klik
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(model, true);
      if (intersects.length > 0) onSelect(id);
    };

    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [camera, gl, id, onSelect]);

  // 🔹 Drag & Rotate mode
  useEffect(() => {
    if (mode === "camera") return;
    const model = modelRef.current;
    if (!model) return;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const offset = new THREE.Vector3();
    const intersection = new THREE.Vector3();
    let isActive = false;

    const handleMouseDown = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(model, true);
      if (intersects.length > 0) {
        isActive = true;
        setDragging(true);
        if (mode === "drag") {
          plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()),
            model.position
          );
          raycaster.ray.intersectPlane(plane, intersection);
          offset.copy(intersection).sub(model.position);
        }
      }
    };

    const handleMouseMove = (event) => {
      if (!isActive) return;
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (mode === "drag") {
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(plane, intersection);
        model.position.copy(intersection.sub(offset));
      }
      if (mode === "rotateX") model.rotation.x += event.movementY * 0.01;
      if (mode === "rotateY") model.rotation.y += event.movementX * 0.01;
      if (mode === "rotateZ") model.rotation.z += event.movementX * 0.01;
    };

    const handleMouseUp = () => {
      if (isActive) {
        isActive = false;
        setDragging(false);
      }
    };

    gl.domElement.addEventListener("mousedown", handleMouseDown);
    gl.domElement.addEventListener("mousemove", handleMouseMove);
    gl.domElement.addEventListener("mouseup", handleMouseUp);
    return () => {
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
      gl.domElement.removeEventListener("mousemove", handleMouseMove);
      gl.domElement.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mode, camera, gl, setDragging]);

  return (
    <group ref={modelRef} position={position}>
      {/* 💬 Teks muncul di card */}
      {type === "card" && text && (
        <Text
          position={[1, 0.18, 0.12]}
          fontSize={99.035}
          color="black"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.4}
          lineHeight={1.2}
          textAlign="center"
        >
          {text}
        </Text>
      )}
    </group>
  );
}
function SceneContent({ children, sceneRef }) {
  const { scene } = useThree();
  const exportGroupRef = useRef();
  useEffect(() => {
    if (exportGroupRef.current) {
      sceneRef.current = exportGroupRef.current;
      console.log("Export Group berhasil di-set.");
    }
  }, [sceneRef]);

  return <group ref={exportGroupRef}>{children}</group>;
}
const GalleryCard = ({ name, imageSrc, onAddObject, path }) => {
  // Menentukan warna background yang sedikit berbeda untuk Wrapper (abu-abu/grayscale)
  const isWrapper = name === 'Wrapper';
  const topBgColor = isWrapper ? '#c0c0c0' : '#e3e3e3';
  const bottomBgColor = isWrapper ? '#808080' : '#b0afa9';
  const [objects, setObjects] = useState([]);

  console.log(path);

  const handleAdd = () => {
    setObjects((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "flower",
        path,
        position: [prev.length * 0.5, 0, 0],
      },
    ]);
    // onAddObject(name);
  };

  console.log(onAddObject);

  return (
    <div 
      className="Customizer-gallery-card-btn" 
      onClick={() => onAddObject(name, path)}
      role="button"
      tabIndex={0}
      style={{ boxShadow: isWrapper ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)' }} // Shadow sedikit lebih gelap untuk Wrapper
    >
      {/* Layer Background */}
      <div className="Customizer-card-bg">
        <div className="Customizer-bg-top" style={{ backgroundColor: topBgColor }}></div>
        <div className="Customizer-bg-bottom" style={{ backgroundColor: bottomBgColor }}>
          <span className="Customizer-label-text">{`+ ${name}`}</span>
        </div>
      </div>

      {/* Layer Gambar 3D */}
      <img 
        src={imageSrc} 
        alt={`Add ${name}`} 
        className="Customizer-card-img"
        style={{ width: name === 'Wrapper' ? '110%' : '85%' }} // Wrapper sedikit lebih besar
      />
    </div>
  );
};

// --- 3. Komponen Utama Galeri ---
const FlowerGallery = ({onAddObject, components}) => {
  const { showAlert } = useAlert();
  console.log("component di gallery", components);
  console.log("component di gallery", components[0]?.Name);
  
  // Fungsi yang dijalankan saat tombol diklik
  const handleAddObject = (objectName) => {
    console.log(`Menambahkan objek ${objectName} ke scene...`);
    showAlert(`Objek '${objectName}' Berhasil Ditambahkan!`);
  };

    const objects = components.map((item) => ({
      name: item.Name,
      image: item.Image, // langsung dari backend
      path: item.Asset,
      price: item.Price,
      itemId: item.ItemId
    }));

  return (
    <div className="Customizer-gallery-container">
      {objects.map((obj) => (
        <GalleryCard
          key={obj.name}
          name={obj.name}
          imageSrc={obj.image}
          path={obj.path}
          onAddObject={onAddObject} // Teruskan fungsi
        />
      ))}

      {/* Style CSS Internal */}
      <style>{`
        .Customizer-gallery-container {
          display: flex;
          gap: 20px;
          padding-top: 10px;
          padding-bottom: 20px; /* Tambahkan ruang untuk shadow agar tidak terpotong */
          padding-left: 5%;    /* Agar sejajar dengan teks judul di atasnya */
          padding-right: 5%;   /* Memberi ruang di akhir scroll */
          
          /* Inti dari scroll horizontal */
          overflow-x: auto;
          scroll-behavior: smooth; /* Agar scroll terasa halus */
          -webkit-overflow-scrolling: touch; /* Untuk scroll yang mulus di iOS */
        }

        /* Sembunyikan scrollbar agar tampilan lebih bersih (Opsional) */
        .Customizer-gallery-container::-webkit-scrollbar {
          display: none; /* Untuk Chrome, Safari, dan Opera */
        }
        .Customizer-gallery-container {
          -ms-overflow-style: none;  /* Untuk IE dan Edge */
          scrollbar-width: none;  /* Untuk Firefox */
        }

        /* Tambahan: Pastikan kartu tidak mengecil (shrink) */
        .Customizer-gallery-card-btn {
          flex-shrink: 0; /* WAJIB agar kartu tidak gepeng saat konten penuh */
          position: relative;
          width: 140px;
          height: 160px;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .Customizer-gallery-card-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 15px rgba(0,0,0,0.25);
        }

        .Customizer-gallery-card-btn:active {
          transform: scale(0.98);
        }

        .Customizer-card-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          z-index: 1;
        }

        .Customizer-bg-top {
          flex: 65;
        }

        .Customizer-bg-bottom {
          flex: 35;
          display: flex;
          justify-content: center;
          align-items: center;
          padding-top: 10px;
        }

        .Customizer-label-text {
          font-family: 'Times New Roman', serif;
          color: white;
          font-size: 18px;
          letter-spacing: 1px;
          z-index: 3;
        }

        /* Gambar objek */
        .Customizer-card-img {
          position: absolute;
          top: 55%; 
          left: 50%;
          transform: translate(-50%, -50%);
          height: auto;
          z-index: 2;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

const WRAPPER_COLORS = [
  { id: 1, hex: '#000000', label: 'Beige', isSelected: true },
  { id: 2, hex: '#ffffff', label: 'Cream' },
  { id: 3, hex: '#f4cb9e', label: 'Aqua' },
  { id: 4, hex: '#fca1b6', label: 'Purple' },
  { id: 5, hex: '#8fd9fa', label: 'Violet' },
];

const RIBBON_COLORS = [
  { id: 10, hex: '#000000', label: 'Beige' },
  { id: 11, hex: '#ffffff', label: 'Cream' },
  { id: 12, hex: '#f4cb9e', label: 'Aqua' },
  { id: 13, hex: '#fca1b6', label: 'Purple', isSelected: true }, // Contoh default terpilih lain
  { id: 14, hex: '#8fd9fa', label: 'Violet' },
];

const ColorSelector = ({ title, colors, selectedColor, onColorChange }) => {
  // State untuk melacak warna mana yang saat ini dipilih
  const [selectedColorId, setSelectedColorId] = useState(colors[0].id);

  const handleColorClick = (id) => {
    setSelectedColorId(id);
    console.log(`Warna ${title} diubah ke ID: ${id}`);
    // Di sini Anda bisa memanggil fungsi props untuk mengubah state aplikasi utama
  };

  return (
    <>
      <div className="Customizer-color-selector-group">
        <h3 className="Customizer-selector-title">{title}</h3>
        <div className="Customizer-color-bar-container">
          {colors.map((color) => {
            // Karena sekarang menggunakan format hex string dari state utama
            const isSelected = color.hex === selectedColor;
            return (
              <div
                key={color.id}
                className="Customizer-color-swatch-Wrapper"
                onClick={() => onColorChange(color.hex)} // Panggil fungsi dari MainSection
              >
                <div
                  className={`Customizer-color-swatch ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: color.hex }}
                  role="button"
                  tabIndex={0}
                ></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Style CSS Internal */}
      <style>{`

      @media (max-width: 600px){
        .Customizer-color-selector-group {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .Customizer-selector-title {
          font-family: 'Times New Roman', serif;
          font-size: 18px;
          font-weight: normal;
          margin: 0 0 8px 0; /* Jarak antara judul dan bar warna */
          color: #333;
        }

        .Customizer-color-bar-container {
          display: flex;
          align-items: center;
          background-color: #808080; /* Warna abu-abu latar belakang bar */
          border-radius: 20px;
          padding: 8px 10px;
          gap: 10px; /* Jarak antar lingkaran warna */
        }

        .Customizer-color-swatch-Wrapper {
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .Customizer-color-swatch-Wrapper:hover {
          transform: scale(1.1); /* Efek saat di-hover */
        }

        .Customizer-color-swatch {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid transparent; /* Border default transparan */
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }

        /* Gaya untuk warna yang dipilih */
        .Customizer-color-swatch.selected {
          border-color: #d19077; /* Warna oranye/cokelat untuk border terpilih */
          box-shadow: 0 0 0 1px #d19077; /* Bayangan tipis untuk mempertegas */
        }
      }

      @media (min-width : 1024px) {
        .Customizer-color-selector-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .Customizer-selector-title {
          font-family: 'Times New Roman', serif;
          font-size: 18px;
          font-weight: normal;
          margin: 0 0 8px 0; /* Jarak antara judul dan bar warna */
          color: #333;
        }

        .Customizer-color-bar-container {
          display: flex;
          align-items: center;
          background-color: #808080; /* Warna abu-abu latar belakang bar */
          border-radius: 20px;
          padding: 8px 10px;
          gap: 10px; /* Jarak antar lingkaran warna */
        }

        .Customizer-color-swatch-Wrapper {
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .Customizer-color-swatch-Wrapper:hover {
          transform: scale(1.1); /* Efek saat di-hover */
        }

        .Customizer-color-swatch {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid transparent; /* Border default transparan */
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }

        /* Gaya untuk warna yang dipilih */
        .Customizer-color-swatch.selected {
          border-color: #d19077; /* Warna oranye/cokelat untuk border terpilih */
          box-shadow: 0 0 0 1px #d19077; /* Bayangan tipis untuk mempertegas */
        }
      }

      @media (min-width: 600px) {
        .Customizer-color-selector-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .Customizer-selector-title {
          font-family: 'Times New Roman', serif;
          font-size: 18px;
          font-weight: normal;
          margin: 0 0 8px 0; /* Jarak antara judul dan bar warna */
          color: #333;
        }

        .Customizer-color-bar-container {
          display: flex;
          align-items: center;
          background-color: #808080; /* Warna abu-abu latar belakang bar */
          border-radius: 20px;
          padding: 8px 10px;
          gap: 10px; /* Jarak antar lingkaran warna */
        }

        .Customizer-color-swatch-Wrapper {
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .Customizer-color-swatch-Wrapper:hover {
          transform: scale(1.1); /* Efek saat di-hover */
        }

        .Customizer-color-swatch {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid transparent; /* Border default transparan */
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }

        /* Gaya untuk warna yang dipilih */
        .Customizer-color-swatch.selected {
          border-color: #d19077; /* Warna oranye/cokelat untuk border terpilih */
          box-shadow: 0 0 0 1px #d19077; /* Bayangan tipis untuk mempertegas */
        }
      }
        
      `}</style>
    </>
  );
};

// --- Contoh Penggunaan di Halaman Utama ---
const ColorChoose = ({ parcelColor, setParcelColor, ribbonColor, setRibbonColor }) => {
  return (
    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center'}}>
      <ColorSelector 
        title="warna Wrapper" 
        colors={WRAPPER_COLORS}
        selectedColor={parcelColor}
        onColorChange={setParcelColor}
      />
      
      <ColorSelector 
        title="warna ribbon" 
        colors={RIBBON_COLORS} // Pastikan RIBBON_COLORS sudah didefinisikan
        selectedColor={ribbonColor}
        onColorChange={setRibbonColor}
      />
    </div>
  );
};

function MainSection(storeId) {
  // const shopId = "69a581ef883533f34a8dc3b0";
  const shopId = storeId.storeId;
  console.log("shop id di main section", shopId);
  const { showAlert } = useAlert();
  const [objects, setObjects] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [mode, setMode] = useState("camera");
    // Set default awal ke salah satu warna yang diizinkan agar konsisten
    const [parcelColor, setParcelColor] = useState("#f4cb9e");
    const [ribbonColor, setRibbonColor] = useState("#fca1b6");
    const [cardColor, setCardColor] = useState("#cccccc");
    const [cardText, setCardText] = useState("Happy Day 💐");
    const [designId, setDesignId] = useState(null);
  
    const [modelName, setModelName] = useState("");
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
  
    const sceneRef = useRef();

    const [showRotateMenu, setShowRotateMenu] = useState(false);

    const hasFetched = useRef(false);

    const [components, setComponents] = useState([]);

    const { showLoading, hideLoading } = useLoading();

    const [showGrid, setShowGrid] = useState(true);

    const handleGoBack = () => window.history.back();

    // const shopId = "69a581ef883533f34a8dc3b0";

    const fetchData = async () => {
      showLoading("Menyiapkan data model...");

      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/items/shop/${shopId}`
        );
        const dataShop = await response.json();

        console.log("ini abis hit shop");
        console.log(dataShop);

        // ID khusus wrapper
        const WRAPPER_ID = "694e44d385890620cea2e870";

        // array untuk component biasa
        const componentList = [];

        // variable untuk wrapper
        let wrapperData = null;

        dataShop.forEach((item) => {
          const mappedData = {
            Name: item.ComponentId.Name,
            Asset: item.ComponentId.Asset,
            Image : item.ComponentId.Image,
            Price: item.Price,
            ItemId: item._id, // optional, berguna nanti
          };

          // cek apakah dia wrapper
          if (item.ComponentId._id === WRAPPER_ID) {
            wrapperData = mappedData;
          } else {
            componentList.push(mappedData);
          }
        });

        console.log("Components:", componentList);
        console.log("Wrapper:", wrapperData);

        // set ke state
        setComponents(componentList);

        // kalau wrapper ada, inject ke flow kamu
        if (wrapperData) {
          handleAddWrapper(wrapperData);
        }

      } catch (error) {
        console.error("❌ Error fetching data:", error);
      }

      hideLoading();
    };
    useEffect(() => {

      fetchData();
      hasFetched.current = true;
  }, []);

  console.log(components);

  const calculateTotalPrice = () => {
  return objects.reduce((total, obj) => {
    // Cari komponen yang memiliki path yang sama dengan modelPath objek
    const componentData = components.find(comp => comp.Asset === obj.modelPath);
    
    // Jika ketemu harganya, tambahkan ke total. Jika tidak, tambah 0.
    const price = componentData ? componentData.Price : 0;
    
    return total + price;
  }, 0);
};

// Kamu bisa menyimpan nilai ini di variabel biasa karena akan re-render otomatis

const getGroupedSummary = () => {
  // Buat rincian berdasarkan data master di state 'components'
  return components.map((comp) => {
    // Hitung berapa banyak objek ini ada di canvas berdasarkan modelPath
    const count = objects.filter((obj) => obj.modelPath === comp.Asset).length;
    const subTotal = count * (comp.Price || 0);

    let tempId = ""

    return {
      name: comp.Name,
      qty: count,
      price: subTotal,
      ItemId : comp.ItemId
    };
  });
};

const summaryData = getGroupedSummary();
const totalPrice = summaryData.reduce((sum, item) => sum + item.price, 0);

const formattedSummary = summaryData.map(item => [item.ItemId, item.qty]);

    const handleSaveDesign = async () => {
      if (!modelName.trim())
        return showAlert("⚠️ Masukkan nama model terlebih dahulu!");
      if (!question.trim() || !answer.trim())
        return showAlert("⚠️ Isi pertanyaan dan jawaban untuk proteksi AR!");
  
      const flowers = objects
        .filter((obj) => obj.type === "flower")
        .map((obj) => ({
          type: obj.modelPath.includes("tulip")
            ? "tulip"
            : obj.modelPath.includes("rose")
            ? "rose"
            : "lilly",
          modelPath: obj.modelPath,
          position: obj.position || [0, 0, 0],
          rotation: obj.rotation || [0, 0, 0],
          scale: obj.scale || [1, 1, 1],
        }));
  
      const wrapperObj = objects.find((obj) => obj.type === "Wrapper");
      const cardObj = objects.find((obj) => obj.type === "card");
  
      const designData = {
        name: modelName,
        flowers:
          flowers.length > 0
            ? flowers
            : [
                {
                  type: "rose",
                  modelPath: "/models/rose.glb",
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  scale: [1, 1, 1],
                },
              ],
        Wrapper: wrapperObj
          ? {
              modelPath: "/models/Wrapper.glb",
              parcelColor,
              ribbonColor,
              position: wrapperObj.position || [0, 0, 0],
              rotation: wrapperObj.rotation || [0, 0, 0],
            }
          : {
              modelPath: "/models/Wrapper.glb",
              parcelColor,
              ribbonColor,
              position: [0, 0, 0],
              rotation: [0, 0, 0],
            },
        card: cardObj
          ? {
              modelPath: "/models/card.glb",
              color: cardColor,
              text: cardText,
              position: cardObj.position || [0, 0.2, 0],
              rotation: cardObj.rotation || [0, 0, 0],
            }
          : {
              modelPath: "/models/card.glb",
              color: cardColor,
              text: cardText,
              position: [0, 0.2, 0],
              rotation: [0, 0, 0],
            },
        question,
        answer,
      };
  
      console.log("🧩 Data dikirim ke backend:", designData);
  
      try {
        const res = await fetch("${process.env.REACT_APP_API_URL}/api/design3d/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(designData),
        });
        const data = await res.json();
  
        if (res.ok) {
          setDesignId(data._id || data.designId);
          showAlert("✅ Desain berhasil disimpan!");
          // reset field pertanyaan
          setQuestion("");
          setAnswer("");
        } else {
          showAlert(`❌ Gagal: ${data.message}`);
        }
      } catch (err) {
        console.error("❌ Error saat menyimpan desain:", err);
        showAlert("❌ Gagal menyimpan desain ke server");
      }
    };
  
    const handleExportGLB = async () => {
      if (!sceneRef.current) {
        showAlert("⚠️ Model belum siap untuk diekspor!");
        return;
      }
      if (!designId) {
        showAlert("💾 Simpan desain terlebih dahulu sebelum ekspor!");
        return;
      }
  
      const exporter = new GLTFExporter();
  
      // 1. Opsi Eksport: Pastikan binary: false untuk GLTF (JSON)
      const options = {
        binary: false, // Menghasilkan JSON
        embedImages: true,
        onlyVisible: true,
      };
  
      exporter.parse(
        sceneRef.current,
        async (result) => {
          // 2. Pemeriksaan Tipe Hasil: Cek apakah result adalah objek JSON
          if (typeof result !== "object") {
            console.error(
              "❌ Export GAGAL menghasilkan objek JSON (GLTF). Cek konsol Three.js."
            );
            showAlert("❌ Export Gagal GLTF. Hasil bukan format JSON.");
            return;
          }
  
          // --- Proses Upload GLTF (JSON) ---
  
          // Konversi objek JSON menjadi string
          const outputJSON = JSON.stringify(result, null, 2);
  
          // 3. Blob & Upload: Buat Blob dengan tipe application/json dan nama file .gltf
          const blob = new Blob([outputJSON], { type: "application/json" });
          const formData = new FormData();
  
          // Ubah ekstensi menjadi .gltf
          formData.append("model", blob, `${designId}.gltf`);
  
          // ... (Kode fetch ke backend)
          try {
            const res = await fetch(
              `${process.env.REACT_APP_API_URL}/api/design3d/${designId}/export`,
              {
                method: "POST",
                body: formData,
              }
            );
            const data = await res.json();
  
            if (res.ok) {
              showAlert(
                "✅ Model berhasil diekspor dan diunggah ke server sebagai GLTF!"
              );
            } else {
              showAlert(`❌ Gagal: ${data.message}`);
            }
          } catch (err) {
            console.error("❌ Gagal upload model:", err);
            showAlert("❌ Gagal mengirim file GLTF ke server.");
          }
        },
        options
      );
    };
  
    // 🔹 Fungsi menambah objek
    const addFlower = (type) => {
      let modelPath = "/models/tulip.glb";
      if (type === "rose") modelPath = "/models/rose.glb";
      else if (type === "lilly") modelPath = "/models/lilly.glb";
      setObjects((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "flower",
          modelPath,
          position: [prev.length * 0.5, 0, 0],
        },
      ]);
    };
  
    const addWrapper = () => {
      setObjects((prev) => [
        ...prev.filter((o) => o.type !== "Wrapper"),
        {
          id: Date.now(),
          type: "Wrapper",
          modelPath: "/models/Wrapper.glb",
          position: [0, 0, 0],
        },
      ]);
    };
  
    const addCard = () => {
      setObjects((prev) => [
        ...prev.filter((o) => o.type !== "card"),
        {
          id: Date.now(),
          type: "card",
          modelPath: "/models/card.glb",
          position: [0, 0.2, 0],
          text: cardText,
        },
      ]);
    };
  
    const deleteSelected = () => {
      if (!selectedId) return showAlert("Tidak ada objek yang dipilih!");
      if (selectedId) {
        const targetObj = objects.find(o => o.id === selectedId);
        // Hanya hapus jika objek bukan wrapper yang dikunci
        if (targetObj && targetObj.type !== "Wrapper") {
          setObjects((prev) => prev.filter((obj) => obj.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
  
    const resetAll = () => {
      if (window.confirm("Yakin ingin menghapus semua objek?")) {
        // Bukannya mengosongkan array [], kita filter agar yang 'isLocked' tetap tinggal
        setObjects((prevObjects) => prevObjects.filter((obj) => obj.type === "Wrapper"));
        
        // Pastikan tidak ada objek yang sedang terpilih setelah reset
        setSelectedId(null);
      }
    };

    const handleAddFromGallery = (type, path) => {
    if (type === 'Wrapper') {
      // Jika Wrapper, ganti yang lama (hanya boleh ada 1 Wrapper)
      setObjects((prev) => [
        ...prev.filter((o) => o.type !== "Wrapper"),
        {
          id: Date.now(),
          type: "Wrapper",
          modelPath: path,
          position: [0, 0, 0],
        },
      ]);
    } else {
      // Jika bunga, tambahkan baru
      setObjects((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "flower",
          modelPath: path,
          position: [prev.length * 0.5, 0, 0],
        },
      ]);
    }
  };

  const handleAddWrapper = (type, path) => {
      // Jika Wrapper, ganti yang lama (hanya boleh ada 1 Wrapper)
      setObjects((prev) => [
        // ...prev.filter((o) => o.type !== "Wrapper"),
        {
          id: Date.now(),
          type: "Wrapper",
          modelPath: "/models/wrapper.glb",
          position: [0, 0, 0],
        },
      ]);
  };


  const navigate = useNavigate();
  const [BouquetData, setBouquetData] = useState({
    BouquetName: "",
    BouquetQuestion: "",
    BouquetAnswer: ""
  });
  const handleSave = async () => {
    if (objects.length === 0) return showAlert("⚠️ Tambahkan bunga terlebih dahulu!");
    if (!sceneRef.current) return showAlert("⚠️ Scene belum siap!");

    setBouquetData({
      BouquetName: modelName,
      BouquetQuestion: question,
      BouquetAnswer: answer
    });

    if (
      !BouquetData.BouquetName 
      // ||
      // !BouquetData.BouquetQuestion ||
      // !BouquetData.BouquetAnswer
    ) {
      showAlert("Mohon lengkapi nama buket!");
      return;
    }

    const summary = components.map((comp) => {
    const count = objects.filter((obj) => obj.modelPath === comp.Asset).length;
    return {
      name: comp.Name,
      qty: count,
      pricePerUnit: comp.Price || 0,
      subTotal: count * (comp.Price || 0)
    };
  });
  const finalPrice = summary.reduce((sum, item) => sum + item.subTotal, 0);

  setShowGrid(false);
  await new Promise((resolve) => setTimeout(resolve, 100));

  const canvas = document.querySelector('canvas');
  const screenshot = canvas ? canvas.toDataURL("image/png") : null;

  setShowGrid(true);

    const exporter = new GLTFExporter();
    
    // Opsi Export
    const options = {
      binary: true, // Kita gunakan Binary (GLB) agar lebih hemat tempat di IndexedDB
      embedImages: true,
      onlyVisible: true,
    };

    console.log("formattedSummary ", formattedSummary)

    // let formattedItems = [{
    //   ComponentId : "",
    //   Quantity : 0
    // }];

    const formattedItems = summaryData.map(formattedSummary => [{ItemId : formattedSummary.ItemId, Quantity : formattedSummary.qty}]);
    
    console.log("FORMATTED ITEMS ", formattedItems)

    console.log("📦 Memulai proses export ke IndexedDB...");

    exporter.parse(
      sceneRef.current,
      async (result) => {
        try {
          // 1. Simpan file 3D (ArrayBuffer) ke IndexedDB
          // Kita beri kunci 'pending_order_model'
          await setDb('pending_order_model', result);

          // 2. Simpan Informasi Tambahan (Metadata) agar bisa dibaca di hal checkout
          const orderMeta = {
          objects,        // Untuk load ulang model jika perlu
          summary,        // Rincian per item (Lilly x2, dll)
          totalPrice: finalPrice,
          parcelColor,
          ribbonColor,
          cardText,
          modelName,
          question : "",
          answer : "",
          shopId : shopId,
          items : formattedItems,
          thumbnail: screenshot,
          timestamp: Date.now()
        };
          await setDb('pending_order_meta', orderMeta);

          console.log("✅ Data berhasil diamankan di IndexedDB");
          
          // 3. Pindah ke halaman checkout
          navigate('/confirmation'); 
        } catch (err) {
          console.error("❌ Gagal menyimpan ke IndexedDB:", err);
          showAlert("Gagal memproses model 3D.");
        }
      },
      options
    );
  };

  useEffect(() => {
    const resumeDesign = async () => {
      // Ambil metadata untuk mendapatkan status objek, warna, dll.
      const savedMeta = await getDb('pending_order_meta');
      
      if (savedMeta && savedMeta.objects) {
        // Jika ada desain sebelumnya, masukkan kembali ke state
        setObjects(savedMeta.objects);
        setParcelColor(savedMeta.parcelColor);
        setRibbonColor(savedMeta.ribbonColor);
        setCardText(savedMeta.cardText);
        console.log("🔄 Desain sebelumnya berhasil dimuat kembali.");
      }
    };

    resumeDesign();
  }, []);

  useEffect(() => {
  const resumeDesign = async () => {
    try {
      const savedMeta = await getDb('pending_order_meta');
      
      if (savedMeta) {
        // 1. Kembalikan state dasar
        if (savedMeta.objects) setObjects(savedMeta.objects);
        if (savedMeta.parcelColor) setParcelColor(savedMeta.parcelColor);
        if (savedMeta.ribbonColor) setRibbonColor(savedMeta.ribbonColor);
        if (savedMeta.cardText) setCardText(savedMeta.cardText);
        
        // Opsional: set metadata lainnya jika ada seperti pertanyaan/jawaban
        console.log("🔄 Desain sebelumnya berhasil dimuat dari IndexedDB");
      }
    } catch (err) {
      console.error("Gagal memuat desain lama:", err);
    }
  };

  resumeDesign();
}, [setObjects, setParcelColor, setRibbonColor, setCardText]);



  return (
    
    <div>
      <script src="https://kit.fontawesome.com/4700816e81.js" crossorigin="anonymous"></script>
      <section className='Customizer-MainSection'>
        <div className="Customizer-box"></div>
        <div className="Customizer-SectionContainer">
          <div className="Confirmation-Back-Container" style={{ display : "flex", justifyContent : "flex-start", alignItems : "center", width : "100%"}}>
            <button className="TernaryBackButton" onClick={handleGoBack}>
            ←
            </button>
          </div>
          <div className="Customizer-MainBox">
            <div className="Customizer-ModelBox border-4 border-gray-1000 rounded-lg overflow-hidden" style={{ position: "relative" }}>
              {/* --- TOMBOL MODE (Melayang di kiri atas) --- */}
              {/* Floating Action Toolbar (Sisi Kanan) */}
              <div className="Customizer-canvas-toolbar">
                {/* Tombol Kamera/Mode */}
                <button 
                  className={`Customizer-toolbar-btn ${mode === 'camera' ? 'active' : ''}`}
                  onClick={() => setMode('camera')}
                  title="Camera Mode"
                >
                <span className="Customizer-icon"><FaCamera /></span>
                </button>

                <div className="Customizer-toolbar-divider"></div>

                {/* Tombol Hapus */}
                <button className="Customizer-toolbar-btn" onClick={deleteSelected} title="Hapus Objek">
                  <span className="Customizer-icon"><FaTrash /></span>
                </button>

                {/* Tombol Reset */}
                <button className="Customizer-toolbar-btn" onClick={resetAll} title="Reset Semua">
                  <span className="Customizer-icon">❌</span>
                </button>

                <div className="Customizer-toolbar-divider"></div>

                {/* Tombol Drag / Move */}
                <button 
                  className={`Customizer-toolbar-btn ${mode === 'drag' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('drag');
                    setShowRotateMenu(false); // Tutup menu rotasi jika pilih drag
                  }}
                  title="Move Mode"
                >
                  <span className="Customizer-icon"><FontAwesomeIcon icon={faHand} /></span>
                </button>

            {/* Group Tombol Rotasi */}
            <div className="Customizer-rotate-menu-Wrapper">
              <button 
                className={`Customizer-toolbar-btn ${['rotateX', 'rotateY', 'rotateZ'].includes(mode) ? 'active' : ''}`}
                onClick={() => setShowRotateMenu(!showRotateMenu)}
                title="Rotate Mode"
              >
                <span className="Customizer-icon"><FontAwesomeIcon icon={faRotate} /></span>
              </button>

              {/* Sub-menu X, Y, Z yang muncul jika showRotateMenu true */}
              {showRotateMenu && (
                <div className="Customizer-rotate-submenu" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                  {['X', 'Y', 'Z'].map((axis) => (
                    <button
                      key={axis}
                      className={`Customizer-submenu-btn ${mode === `rotate${axis}` ? 'active' : ''}`}
                      onClick={() => setMode(`rotate${axis}`)}
                    >
                      {axis}
                    </button>
                  ))}
                </div>
              )}
            </div>
              </div>
              <Canvas camera={{ position: [1, 5, 5], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
                <color attach="background" args={["#fdfdfd"]} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 10, 5]} intensity={1} />
      
                <SceneContent sceneRef={sceneRef}>
                  {objects.map((obj) => (
                    <Object3DModel
                      key={obj.id}
                      id={obj.id}
                      type={obj.type}
                      modelPath={obj.modelPath}
                      position={obj.position}
                      mode={mode}
                      setDragging={setIsDragging}
                      color={obj.type === "card" ? cardColor : undefined}
                      text={obj.type === "card" ? cardText : undefined}
                      parcelColor={parcelColor}
                      ribbonColor={ribbonColor}
                      isSelected={selectedId === obj.id}
                      onSelect={(id) =>
                        setSelectedId((prev) => (prev === id ? null : id))
                      }
                    />
                  ))}
                </SceneContent>
      
                {showGrid && <gridHelper args={[20, 20, 0x888888, 0x444444]} />}
                <OrbitControls 
                enabled={mode === "camera" && !isDragging}
                enableZoom={false}
                />
              </Canvas>
            </div>
            <div className="Customizer-InfoBox">

            <div className="" style={{ display : "flex", alignSelf : "flex-start", paddingLeft : "5%", fontSize : "32px", paddingBottom : "10px"}}>
                <span>Tentukan bunga</span>
                <span style={{ color: "#ffffff" }}>-</span>
                <span style={{ color: "#A95C4C" }}> pilihan mu</span>
            </div>
              <div className="Customizer-Message">
                <div className="Customizer-input-group">
                  <label htmlFor="nama" className="Customizer-input-label Customizer-label-nama">nama buket</label>
                  <input 
                    type="text" 
                    id="nama" 
                    className="Customizer-input-field-customizer Customizer-input-nama" 
                    name="BouquetName"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)} // Update state saat diketik
                  />
                </div>                        
              </div>

              {/* <div className="Customizer-Question">
                <div className="Customizer-input-group">
                  <label htmlFor="question" className="Customizer-input-label">pertanyaan konfirmasi</label>
                  <input 
                    type="text" 
                    id="question" 
                    className="Customizer-input-field-customizer"
                    name="BouquetQuestion"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </div> 
              </div>

              <div className="Customizer-Answer">
                <div className="Customizer-input-group">
                  <label htmlFor="answer" className="Customizer-input-label">jawaban</label>
                  <input 
                    type="text" 
                    id="answer" 
                    className="Customizer-input-field-customizer"
                    name="BouquetAnswer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </div> 
              </div> */}
              <div className="Customizer-AddModel" style={{ width : '90%' }}>
                <FlowerGallery onAddObject={handleAddFromGallery} components={components}/>
              </div>
              <div className="Customizer-colorAndPrice">
                <div className="Customizer-Color">
                <ColorChoose 
                  parcelColor={parcelColor} 
                  setParcelColor={setParcelColor}
                  ribbonColor={ribbonColor}
                  setRibbonColor={setRibbonColor}
                /> 
                </div>
                  <div className="Customizer-order-summary-container" style={{ padding: '5px' }}>
                    <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>Rincian Pesanan</h3>
                    
                    {summaryData.map((item, index) => (
                      <div key={index} style={{ marginBottom: '5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>{'- '} {item.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '15px' }}>
                          <span>x{item.qty}</span>
                          <span>{item.price.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}

                  <div style={{ borderTop: '2px solid #000', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total Harga</span>
                    <span>Rp {totalPrice.toLocaleString('id-ID')}</span>
                  </div>

                  <style>{`
                  @media (min-width : 1024px) {
                    .Customizer-order-summary-container {
                      border-radius: 8px;
                      width: 100%;
                      max-width: 300px;
                    }
                  }

                  @media (max-width: 600px){
                    .Customizer-order-summary-container {
                        border-radius: 8px;
                        width: 100%;
                        // max-width: 300px;
                    }
                  }
                    
                  `}</style>
                </div>
                </div>
              </div>                
            </div>
          </div>
        <div className="Customizer-box"></div>
      </section>
      <div style={{ display:'flex' }}>
      <div className="Customizer-box"></div>
        <div className="Customizer-btnContainer" style={{display: 'flex', justifyContent: 'center', width: '100%'}}>
            <button className="Customizer-btnAddress" onClick={handleSave}>Selesai</button>
        </div>
      <div className="Customizer-box"></div>
      </div>
    </div>
  )
}

export default function Customizer() {
  const storeId = window.history.state.usr.storeId;
  console.log("STORE ID (Customizer.jsx): ", storeId);
  return (
    <div>
      <MainSection 
        storeId={storeId}
      />
    </div>
  );
}