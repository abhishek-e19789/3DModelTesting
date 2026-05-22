import React, { useState, Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";

const MannequinModel = ({ type, textureUrl, customScale, customY }) => {
  const gltfPath =
    type === "male"
      ? "/models/male_mannequin.glb"
      : "/models/female_mannequin.glb";
  const { scene } = useGLTF(gltfPath);

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    if (textureUrl && clonedScene) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, (texture) => {
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        clonedScene.traverse((child) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.map = texture;
            child.material.needsUpdate = true;
          }
        });
      });
    }
  }, [textureUrl, clonedScene]);

  return (
    <primitive
      object={clonedScene}
      scale={[customScale, customScale, customScale]}
      position={[0, customY, 0]}
    />
  );
};

const App = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [mannequinType, setMannequinType] = useState("male");
  const [isProcessing, setIsProcessing] = useState(false);

  const [scale, setScale] = useState(1);
  const [yOffset, setYOffset] = useState(0);

  const handleModelSwitch = (type) => {
    setMannequinType(type);
    setScale(1);
    setYOffset(0);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setTimeout(() => {
          setUploadedImage(event.target.result);
          setIsProcessing(false);
        }, 1500);
      };
      reader.readAsDataURL(file);
    }
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
            <button
              onClick={() => handleModelSwitch("male")}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                mannequinType === "male"
                  ? "bg-zinc-900 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Male Model
            </button>
            <button
              onClick={() => handleModelSwitch("female")}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                mannequinType === "female"
                  ? "bg-zinc-900 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Female Model
            </button>
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
            onClick={() => {
              setScale(1);
              setYOffset(0);
            }}
            className="text-xs text-gray-500 hover:text-zinc-900 text-left underline underline-offset-2 transition-colors"
          >
            Reset to Default
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-600">
            2. Upload Garment
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors bg-gray-50/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
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
                Click to upload image
              </span>
              <span className="text-xs text-gray-500">Supports JPG, PNG</span>
            </label>
          </div>
        </div>

        {isProcessing && (
          <div className="p-4 bg-zinc-100 text-zinc-700 rounded-lg animate-pulse flex items-center justify-center gap-2 font-medium">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
            Mocking 3D Pipeline...
          </div>
        )}

        {uploadedImage && !isProcessing && (
          <div className="mt-2 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-sm font-semibold text-gray-600 mb-3">
              Extracted Texture Preview
            </p>
            <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm aspect-square bg-gray-100">
              <img
                src={uploadedImage}
                alt="Texture"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </aside>

      <main className="w-2/3 h-full relative bg-gradient-to-br from-gray-100 to-gray-200">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow />
          <directionalLight position={[-2, -5, -2]} intensity={0.5} />
          <Environment preset="city" />

          <Suspense fallback={null}>
            <Center>
              <MannequinModel
                key={mannequinType}
                type={mannequinType}
                textureUrl={uploadedImage}
                customScale={scale}
                customY={yOffset}
              />
            </Center>
          </Suspense>

          <OrbitControls
            enablePan={true}
            minDistance={1}
            maxDistance={100}
            maxPolarAngle={Math.PI / 1.5}
            makeDefault
          />
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
