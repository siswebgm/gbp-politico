import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id?: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  messages: ToastMessage[];
  showToast: (message: ToastMessage) => void;
  hideToast: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  messages: [],
  showToast: (message: ToastMessage) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      messages: [...state.messages, { ...message, id }],
    }));

    if (message.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        }));
      }, message.duration || 3000);
    }
  },
  hideToast: (id: string) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),
}));
