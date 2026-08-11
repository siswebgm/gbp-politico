"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface BannerColorContextType {
  topColor: string | null;
  bottomColor: string | null;
  imageUrl: string | null;
  bannerInView: boolean;
  setTopColor: (color: string | null) => void;
  setBottomColor: (color: string | null) => void;
  setImageUrl: (url: string | null) => void;
  setBannerInView: (inView: boolean) => void;
}

const BannerColorContext = createContext<BannerColorContextType>({
  topColor: null,
  bottomColor: null,
  imageUrl: null,
  bannerInView: false,
  setTopColor: () => {},
  setBottomColor: () => {},
  setImageUrl: () => {},
  setBannerInView: () => {},
});

export function BannerColorProvider({ children }: { children: ReactNode }) {
  const [topColor, setTopColor] = useState<string | null>(null);
  const [bottomColor, setBottomColor] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bannerInView, setBannerInView] = useState(false);

  return (
    <BannerColorContext.Provider
      value={{
        topColor,
        bottomColor,
        imageUrl,
        bannerInView,
        setTopColor,
        setBottomColor,
        setImageUrl,
        setBannerInView,
      }}
    >
      {children}
    </BannerColorContext.Provider>
  );
}

export function useBannerColor() {
  return useContext(BannerColorContext);
}
