import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext(null);

const makeServiceId = () => {
  try {
    return `s_${crypto.randomUUID()}`;
  } catch {
    return `s_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

const normalizeStored = (raw) => {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((it) => {
      if (!it) return null;
      
      if (it.type === 'product' || it.type === 'service') {
        return { ...it, id: it.id || (it.type === 'product' ? it.product : makeServiceId()) };
      }
      
      if (it.product) {
        return { ...it, id: it.product, type: 'product' };
      }
      return null;
    })
    .filter(Boolean);
};

const initialState = {
  items: normalizeStored(JSON.parse(localStorage.getItem('cart')) || []),
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_PRODUCT': {
      const item = { ...action.payload, type: 'product', id: action.payload.product };
      const existing = state.items.find((x) => x.type === 'product' && x.id === item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((x) =>
            x.id === item.id ? { ...x, quantity: (Number(x.quantity) || 0) + (Number(item.quantity) || 0) } : x
          ),
        };
      }
      return { ...state, items: [...state.items, item] };
    }

    case 'ADD_SERVICE': {
      const id = action.payload.id || makeServiceId();
      return { ...state, items: [...state.items, { ...action.payload, id, type: 'service', quantity: 1 }] };
    }

    case 'REPLACE_SERVICE': {
      const { id, payload } = action.payload;
      return {
        ...state,
        items: state.items.map((x) => (x.id === id ? { ...payload, id, type: 'service', quantity: 1 } : x)),
      };
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((x) => x.id !== action.payload) };

    case 'UPDATE_PRODUCT_QUANTITY':
      return {
        ...state,
        items: state.items.map((x) =>
          x.id === action.payload.id && x.type === 'product'
            ? { ...x, quantity: Number(action.payload.quantity) }
            : x
        ),
      };

    case 'CLEAR_CART':
      return { ...state, items: [] };

    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.items));
  }, [state.items]);

  
  const addItem = (item) => dispatch({ type: 'ADD_PRODUCT', payload: item });
  const removeItem = (id) => dispatch({ type: 'REMOVE_ITEM', payload: id });
  const updateQuantity = (id, quantity) => dispatch({ type: 'UPDATE_PRODUCT_QUANTITY', payload: { id, quantity } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  
  const addServiceToCart = (serviceItem) => dispatch({ type: 'ADD_SERVICE', payload: serviceItem });
  const replaceServiceInCart = (id, serviceItem) =>
    dispatch({ type: 'REPLACE_SERVICE', payload: { id, payload: serviceItem } });

  
  
  
  const totalItems = useMemo(
    () =>
      state.items.reduce((sum, x) => {
        if (x.type === 'product') return sum + (Number(x.quantity) || 0);
        return sum + 1; 
      }, 0),
    [state.items]
  );

  const totalPrice = useMemo(
    () =>
      state.items.reduce((sum, x) => {
        if (x.type === 'product') return sum + (Number(x.price) || 0) * (Number(x.quantity) || 0);
        return sum + (Number(x.price) || 0); 
      }, 0),
    [state.items]
  );

  const getTotalItems = () => totalItems;
  const getTotalPrice = () => totalPrice;

  const value = {
    items: state.items,
    addItem,
    addServiceToCart,
    replaceServiceInCart,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    totalItems,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
