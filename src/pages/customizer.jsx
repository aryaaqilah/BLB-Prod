"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Text, useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { useAlert } from "../contexts/AlertContext";

// ✅ Daftar warna yang diizinkan untuk Wrapper dan Ribbon
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
    if (type === "wrapper") cloned.scale.set(2.0, 2.0, 2.0);
    if (type === "card") cloned.scale.set(0.3, 0.3, 0.3);

    // 🎨 Warna parcel & ribbon
    if (type === "wrapper") {
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

export default function FlowerScene() {
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
  const { showAlert } = useAlert();

  const sceneRef = useRef();

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

    const wrapperObj = objects.find((obj) => obj.type === "wrapper");
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
      wrapper: wrapperObj
        ? {
            modelPath: "/models/wrapper.glb",
            parcelColor,
            ribbonColor,
            position: wrapperObj.position || [0, 0, 0],
            rotation: wrapperObj.rotation || [0, 0, 0],
          }
        : {
            modelPath: "/models/wrapper.glb",
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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/design3d/save`, {
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
      ...prev.filter((o) => o.type !== "wrapper"),
      {
        id: Date.now(),
        type: "wrapper",
        modelPath: "/models/wrapper.glb",
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
    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  const resetAll = () => {
    if (window.confirm("Yakin ingin menghapus semua objek?")) {
      setObjects([]);
      setSelectedId(null);
    }
  };

  return (
    <div className="w-full relative bg-gray-100">
      {/* Tombol Mode */}
      <div className="absolute top-6 left-6 flex gap-3 flex-wrap">
        {[
          { name: "Camera", mode: "camera", icon: "🎥", color: "blue" },
          { name: "Drag", mode: "drag", icon: "✋", color: "green" },
          { name: "Rotate X", mode: "rotateX", icon: "🔄X", color: "purple" },
          { name: "Rotate Y", mode: "rotateY", icon: "🔄Y", color: "purple" },
          { name: "Rotate Z", mode: "rotateZ", icon: "🔄Z", color: "purple" },
        ].map((btn) => (
          <button
            key={btn.mode}
            onClick={() => setMode(btn.mode)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              mode === btn.mode
                ? `bg-${btn.color}-600 text-white shadow-lg scale-105`
                : "bg-gray-200 text-black"
            }`}
          >
            {btn.icon} {btn.name}
          </button>
        ))}
      </div>

      {/* Tombol Aksi */}
      <div className="absolute top-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => addFlower("tulip")}
          className="px-6 py-3 bg-pink-600 text-white rounded-xl"
        >
          🌷 Tulip
        </button>
        <button
          onClick={() => addFlower("rose")}
          className="px-6 py-3 bg-red-600 text-white rounded-xl"
        >
          🌹 Rose
        </button>
        <button
          onClick={() => addFlower("lilly")}
          className="px-6 py-3 bg-yellow-600 text-white rounded-xl"
        >
          🌸 Lilly
        </button>
        <button
          onClick={addWrapper}
          className="px-6 py-3 bg-yellow-500 text-white rounded-xl"
        >
          🧺 Wrapper
        </button>
        <button
          onClick={addCard}
          className="px-6 py-3 bg-gray-600 text-white rounded-xl"
        >
          🪪 Card
        </button>
        <button
          onClick={deleteSelected}
          className="px-6 py-3 bg-red-500 text-white rounded-xl"
        >
          🗑️ Hapus
        </button>
        <button
          onClick={resetAll}
          className="px-6 py-3 bg-black text-white rounded-xl"
        >
          ♻️ Reset
        </button>
        {/* Input Nama & Proteksi */}
        <div className="absolute top-6 right-[300px] bg-white rounded-xl shadow-lg p-4 flex flex-col gap-3 w-72">
          <label className="font-semibold text-gray-800">📝 Nama Model</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Masukkan nama desain..."
          />
          <label className="font-semibold text-gray-800">❓ Pertanyaan</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Contoh: Siapa penerima buket ini?"
          />
          <label className="font-semibold text-gray-800">🔐 Jawaban</label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Contoh: Dina"
          />
        </div>

        <button
          onClick={handleSaveDesign}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl"
        >
          💾 Simpan Desain
        </button>
        <button
          onClick={handleExportGLB}
          className="px-6 py-3 bg-green-600 text-white rounded-xl"
        >
          💾 Simpan Model
        </button>
      </div>

      {/* ✅ Panel Warna Dimodifikasi */}
      <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg p-4 flex flex-col gap-3 w-80">
        <div className="flex flex-col gap-2">
          <label className="font-semibold">📦 Parcel:</label>
          <div className="flex gap-2 flex-wrap">
            {ALLOWED_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setParcelColor(color)}
                className={`w-8 h-8 rounded-full border border-gray-300 transition-all ${
                  parcelColor === color
                    ? "ring-2 ring-blue-500 scale-110 shadow-md"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <label className="font-semibold">🎀 Ribbon:</label>
          <div className="flex gap-2 flex-wrap">
            {ALLOWED_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setRibbonColor(color)}
                className={`w-8 h-8 rounded-full border border-gray-300 transition-all ${
                  ribbonColor === color
                    ? "ring-2 ring-blue-500 scale-110 shadow-md"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2">
          <label className="font-semibold">🪶 Card:</label>
          <input
            type="color"
            value={cardColor}
            onChange={(e) => setCardColor(e.target.value)}
          />
        </div>
        <div>
          <label className="font-semibold">💌 Pesan Card:</label>
          <textarea
            value={cardText}
            onChange={(e) => setCardText(e.target.value.slice(0, 120))}
            className="border rounded-lg px-3 py-2 text-sm resize-none h-24 w-full mt-1"
            maxLength={120}
          />
        </div>
      </div>

      {/* Canvas */}
      <div
        className="w-full border-4 border-gray-400 rounded-lg overflow-hidden"
        style={{ height: "900px" }}
      >
        <Canvas camera={{ position: [5, 5, 10], fov: 50 }}>
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

          <gridHelper args={[20, 20, 0x888888, 0x444444]} />
          <OrbitControls enabled={mode === "camera" && !isDragging} />
        </Canvas>
      </div>
    </div>
  );
}