import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext();

const initialState = {
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_START':
    case 'LOGIN_START':
    case 'REGISTER_START':
    case 'LOAD_USER_START':
    case 'LOGOUT_START':
      return { ...state, loading: true, error: null };

    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
    case 'LOAD_USER_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case 'UPDATE_PROFILE_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case 'AUTH_DONE':
      return {
        ...state,
        loading: false,
      };

    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'LOAD_USER_FAIL':
    case 'LOGOUT_SUCCESS':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload || null,
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const cleanupDrafts = () => {
      try {
        const now = Date.now();
        const staleKeys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith('jola-docx-draft:')) continue;
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (!parsed?.updatedAt || now - Number(parsed.updatedAt) > 5 * 60 * 1000) {
              staleKeys.push(key);
            }
          } catch {
            staleKeys.push(key);
          }
        }
        staleKeys.forEach((key) => localStorage.removeItem(key));
      } catch {
      }
    };

    cleanupDrafts();
    const intervalId = window.setInterval(cleanupDrafts, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      dispatch({ type: 'AUTH_START' });
      try {
        const data = await authService.getMe();
        if (!cancelled) {
          dispatch({ type: 'LOAD_USER_SUCCESS', payload: { user: data.user } });
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'AUTH_DONE' });
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const data = await authService.login(email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: data });
      return data;
    } catch (error) {
      dispatch({ type: 'LOGIN_FAIL', payload: error.message || 'Ошибка входа' });
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'REGISTER_START' });
      const data = await authService.register(userData);
      dispatch({ type: 'REGISTER_SUCCESS', payload: data });
      return data;
    } catch (error) {
      dispatch({ type: 'REGISTER_FAIL', payload: error.message || 'Ошибка регистрации' });
      throw error;
    }
  };

  const logout = async () => {
    dispatch({ type: 'LOGOUT_START' });
    try {
      await authService.logout();
    } catch {
    }
    try {
      localStorage.removeItem('polygraphy_edit_draft');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith('jola-docx-draft:')) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
    }
    dispatch({ type: 'LOGOUT_SUCCESS' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (updatedUser) => {
    dispatch({ type: 'UPDATE_PROFILE_SUCCESS', payload: updatedUser });
  };

  const value = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
