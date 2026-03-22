import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  presentationId: string;
  productId: string;
  productName: string;
  presentationName: string;
  imageUrl: string | null;
  salePrice: number;
  quantity: number;
  maxStock: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (presentationId: string) => void;
  updateQuantity: (presentationId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find(
          (i) => i.presentationId === item.presentationId
        );
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.presentationId === item.presentationId
                ? {
                    ...i,
                    quantity: Math.min(
                      i.quantity + item.quantity,
                      i.maxStock
                    ),
                  }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (presentationId) => {
        set({
          items: get().items.filter(
            (i) => i.presentationId !== presentationId
          ),
        });
      },
      updateQuantity: (presentationId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(presentationId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.presentationId === presentationId ? { ...i, quantity } : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      totalItems: () =>
        get().items.reduce((acc, item) => acc + item.quantity, 0),
      totalAmount: () =>
        get().items.reduce(
          (acc, item) => acc + item.salePrice * item.quantity,
          0
        ),
    }),
    { name: "the-deposit-cart" }
  )
);
