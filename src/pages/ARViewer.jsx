import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "@google/model-viewer"; // penting agar tag <model-viewer> dikenali

export default function ARViewer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [modelUrl, setModelUrl] = useState(null);
  const [error, setError] = useState(null);
  const answer = searchParams.get("answer");

  useEffect(() => {
    async function fetchModel() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/design3d/${id}/ar?answer=${answer}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Gagal memuat model");
        if (!data.modelPath) throw new Error("Path model tidak ditemukan");

        // Model path akan dipakai langsung oleh <model-viewer>
        setModelUrl(`${process.env.REACT_APP_API_URL}${data.modelPath}`);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchModel();
  }, [id, answer]);

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-3">❌ Gagal memuat model</h1>
        <p className="text-gray-700">{error}</p>
      </div>
    );
  }

  if (!modelUrl) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">⏳ Memuat model 3D untuk AR...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <model-viewer
        src={modelUrl}
        alt="Desain Buket 3D"
        ar
        ar-modes="scene-viewer webxr quick-look"
        camera-controls
        shadow-intensity="1"
        exposure="1"
        auto-rotate
        style={{
          width: "100%",
          height: "100vh",
          background: "#ffffff",
        }}
      >
      </model-viewer>
    </div>
  );
}
