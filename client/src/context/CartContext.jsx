import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

const initialState = {
  items: JSON.parse(localStorage.getItem('cart')) || [],
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.product === action.payload.product);
      
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.product === action.payload.product
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.product !== action.payload),
      };
    
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.product === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };
    
    default:
      return state;
  }
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.items));
  }, [state.items]);

  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (productId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  const updateQuantity = (productId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return state.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const value = {
    items: state.items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};