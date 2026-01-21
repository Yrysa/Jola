// client/src/context/AuthContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
    case 'LOAD_USER_START':
      return { ...state, loading: true, error: null };

    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
    case 'LOAD_USER_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };

    case 'UPDATE_PROFILE_SUCCESS':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
      };

    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'LOAD_USER_FAIL':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Если токен есть — подтягиваем пользователя с бэка
  useEffect(() => {
    if (state.token && !state.user) {
      loadUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.token]);

  const loadUser = async () => {
    try {
      dispatch({ type: 'LOAD_USER_START' });
      const data = await authService.getMe(); // { user }
      dispatch({
        type: 'LOAD_USER_SUCCESS',
        payload: { user: data.user, token: state.token },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_USER_FAIL',
        payload: error.message || 'Не удалось загрузить пользователя',
      });
      localStorage.removeItem('token');
    }
  };

  const login = async (email, password) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const data = await authService.login(email, password); // { user, token }
      localStorage.setItem('token', data.token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: data,
      });
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAIL',
        payload: error.message || 'Ошибка входа',
      });
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'REGISTER_START' });
      const data = await authService.register(userData); // { user, token }
      localStorage.setItem('token', data.token);
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: data,
      });
    } catch (error) {
      dispatch({
        type: 'REGISTER_FAIL',
        payload: error.message || 'Ошибка регистрации',
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (updatedUser) => {
    dispatch({ type: 'UPDATE_PROFILE_SUCCESS', payload: updatedUser });
  };

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
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
