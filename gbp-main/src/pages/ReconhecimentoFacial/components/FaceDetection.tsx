import React, { useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';
import { debounce } from 'lodash';

type DetectedFace = {
  box: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
  keypoints: Array<{
    x: number;
    y: number;
    name: string;
  }>;
};

interface FaceDetectionProps {
  imageData: string | null;
  onDetection: (faces: DetectedFace[]) => void;
}

export const FaceDetection: React.FC<FaceDetectionProps> = ({ imageData, onDetection }) => {
  const [faceDetected, setFaceDetected] = useState(false);
  const [model, setModel] = useState<faceDetection.FaceDetector | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);

  // Debounce da função de detecção para evitar chamadas excessivas
  const debouncedDetectFaces = useCallback(
    debounce(async (model: faceDetection.FaceDetector, imageData: string) => {
      const now = Date.now();
      if (now - lastDetectionTime < 500) return; // Evita detecções muito próximas

      const img = new Image();
      img.src = imageData;
      await img.decode();

      const faces = await model.estimateFaces(img, {
        flipHorizontal: false
      });

      const formattedFaces: DetectedFace[] = faces.map(face => ({
        box: {
          xMin: face.box.xMin,
          yMin: face.box.yMin,
          xMax: face.box.xMax,
          yMax: face.box.yMax,
          width: face.box.width,
          height: face.box.height
        },
        keypoints: face.keypoints.map(kp => ({
          x: kp.x,
          y: kp.y,
          name: kp.name || 'unknown'
        }))
      }));

      if (formattedFaces.length > 0) {
        setFaceDetected(true);
        onDetection(formattedFaces);
      } else {
        setFaceDetected(false);
      }

      setLastDetectionTime(now);
    }, 500), // Delay de 500ms entre detecções
    [onDetection, lastDetectionTime]
  );

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const model = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        { runtime: 'tfjs' }
      );
      setModel(model);
      setLoading(false);
    };

    loadModel();
  }, []);

  useEffect(() => {
    if (model && imageData) {
      debouncedDetectFaces(model, imageData);
    }
  }, [model, imageData, onDetection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-2 text-gray-600">Carregando modelo de detecção...</span>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {faceDetected && (
        <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-4 py-2 rounded-lg flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Rosto detectado! Procurando por correspondências...
        </div>
      )}
    </div>
  );
};
