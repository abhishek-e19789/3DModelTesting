import React, { useState, Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";

const MODEL_DEFAULTS = {
  male: { scale: 0.25, yOffset: -2.6 },
  female: { scale: 0.25, yOffset: 1.3 },
};

const MESHY_API_KEY = "YOUR_MESHY_API_KEY_HERE";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const ClothingOverlay = ({ url }) => {
  const { scene } = useGLTF(url);

  const clonedClothing = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  return <primitive object={clonedClothing} />;
};

function SceneResetter({ mannequinType }) {
  const { camera, controls } = useThree((s) => ({
    camera: s.camera,
    controls: s.controls,
  }));

  useEffect(() => {
    if (!controls) return;
    const id = setTimeout(() => {
      controls.target.set(0, 0, 0);
      camera.position.set(0, 0, 10);
      controls.update();
    }, 50);
    return () => clearTimeout(id);
  }, [mannequinType, controls, camera]);

  return null;
}

const MaleMannequin = ({ clothingUrl, customScale, customY }) => {
  const { scene } = useGLTF("/models/male_mannequin.glb");

  const baseScale = 1;
  const baseY = 0;

  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  const finalScale = baseScale * customScale;
  const finalY = baseY + customY;

  return (
    <group
      scale={[finalScale, finalScale, finalScale]}
      position={[0, finalY, 0]}
    >
      <primitive object={clonedScene} />
      {clothingUrl && (
        <Suspense fallback={null}>
          <ClothingOverlay url={clothingUrl} />
        </Suspense>
      )}
    </group>
  );
};

const FemaleMannequin = ({ clothingUrl, customScale, customY }) => {
  const { scene } = useGLTF("/models/female_mannequin.glb");

  const baseScale = 1;
  const baseY = 0;

  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  const finalScale = baseScale * customScale;
  const finalY = baseY + customY;

  return (
    <group
      scale={[finalScale, finalScale, finalScale]}
      position={[0, finalY, 0]}
    >
      <primitive object={clonedScene} />
      {clothingUrl && (
        <Suspense fallback={null}>
          <ClothingOverlay url={clothingUrl} />
        </Suspense>
      )}
    </group>
  );
};

function ModelLoader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#d1d5db" wireframe />
    </mesh>
  );
}

const App = () => {
  const [clothingUrl, setClothingUrl] = useState(null);
  const [mannequinType, setMannequinType] = useState("male");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState("");
  const [scale, setScale] = useState(MODEL_DEFAULTS.male.scale);
  const [yOffset, setYOffset] = useState(MODEL_DEFAULTS.male.yOffset);

  const handleModelSwitch = (type) => {
    if (type === mannequinType) return;
    setMannequinType(type);
    setScale(MODEL_DEFAULTS[type].scale);
    setYOffset(MODEL_DEFAULTS[type].yOffset);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessMsg("Preparing image...");

    try {
      const base64Image = await fileToBase64(file);

      setProcessMsg("Sending to Meshy AI...");

      const createRes = await fetch("https://api.meshy.ai/v1/image-to-3d", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MESHY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: base64Image,
          enable_pbr: true,
        }),
      });

      const createData = await createRes.json();

      if (createData.message) {
        throw new Error(createData.message);
      }

      const taskId = createData.result;

      while (true) {
        await new Promise((r) => setTimeout(r, 5000));

        const pollRes = await fetch(
          `https://api.meshy.ai/v1/image-to-3d/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${MESHY_API_KEY}`,
            },
          },
        );

        const pollData = await pollRes.json();

        if (pollData.status === "SUCCEEDED") {
          setClothingUrl(pollData.model_urls.glb);
          break;
        } else if (
          pollData.status === "FAILED" ||
          pollData.status === "EXPIRED"
        ) {
          throw new Error("Meshy AI failed to generate the mesh.");
        } else {
          setProcessMsg(`Meshy AI: ${pollData.progress || 0}% complete...`);
        }
      }
    } catch (error) {
      console.error(error);
      alert(`3D Generation Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessMsg("");
    }
  };

  const resetCalibration = () => {
    setScale(MODEL_DEFAULTS[mannequinType].scale);
    setYOffset(MODEL_DEFAULTS[mannequinType].yOffset);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans">
      <aside className="w-1/3 p-8 flex flex-col gap-8 bg-white shadow-xl z-10 overflow-y-auto">
        <div>
          <h1 className="text-3xl font-bold mb-2">Virtual Try-On</h1>
          <p className="text-sm text-gray-500">Feature Testing Prototype</p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-600">
            1. Select Mannequin
          </label>
          <div className="flex gap-2">
            {["male", "female"].map((type) => (
              <button
                key={type}
                onClick={() => handleModelSwitch(type)}
                className={`flex-1 py-3 rounded-lg font-medium capitalize transition-all ${
                  mannequinType === type
                    ? "bg-zinc-900 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type} Model
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-gray-100 p-4 rounded-xl border border-gray-200">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-600">
            Model Calibration
          </label>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Overall Size (Scale)</span>
              <span>{scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-zinc-900"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Vertical Position (Y-Offset)</span>
              <span>{yOffset.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={yOffset}
              onChange={(e) => setYOffset(parseFloat(e.target.value))}
              className="w-full accent-zinc-900"
            />
          </div>

          <button
            onClick={resetCalibration}
            className="text-xs text-gray-500 hover:text-zinc-900 text-left underline underline-offset-2 transition-colors"
          >
            Reset to Default
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-600">
            2. Upload 2D Garment Image
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors bg-gray-50/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center gap-3 ${isProcessing ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="text-zinc-900 font-medium">
                Click to upload 2D clothing image
              </span>
              <span className="text-xs text-gray-500">Supports JPG, PNG</span>
            </label>
          </div>
        </div>

        {isProcessing && (
          <div className="p-4 bg-zinc-100 text-zinc-700 rounded-lg animate-pulse flex items-center justify-center gap-2 font-medium">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
            {processMsg}
          </div>
        )}

        {clothingUrl && !isProcessing && (
          <div className="mt-2">
            <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-xl flex flex-col gap-2">
              <span className="text-sm font-semibold">
                ✓ 3D Mesh Generated & Loaded
              </span>
              <button
                onClick={() => setClothingUrl(null)}
                className="text-xs text-green-700 hover:text-green-900 text-left underline underline-offset-2 transition-colors"
              >
                Remove Garment
              </button>
            </div>
          </div>
        )}
      </aside>

      <main className="w-2/3 h-full relative bg-gradient-to-br from-gray-100 to-gray-200">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 45 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow />
          <directionalLight position={[-2, -5, -2]} intensity={0.5} />
          <Environment preset="city" />

          <OrbitControls
            makeDefault
            enablePan
            minDistance={1}
            maxDistance={100}
            maxPolarAngle={Math.PI / 1.5}
          />
          <SceneResetter mannequinType={mannequinType} />

          <Suspense fallback={<ModelLoader />}>
            <Center>
              {mannequinType === "male" ? (
                <MaleMannequin
                  clothingUrl={clothingUrl}
                  customScale={scale}
                  customY={yOffset}
                />
              ) : (
                <FemaleMannequin
                  clothingUrl={clothingUrl}
                  customScale={scale}
                  customY={yOffset}
                />
              )}
            </Center>
          </Suspense>
        </Canvas>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 text-zinc-800 px-6 py-3 rounded-full text-sm shadow-lg backdrop-blur-md pointer-events-none font-medium tracking-wide border border-white/20">
          Left Click + Drag to Rotate • Right Click + Drag to Pan • Scroll to
          Zoom
        </div>
      </main>
    </div>
  );
};

export default App;
