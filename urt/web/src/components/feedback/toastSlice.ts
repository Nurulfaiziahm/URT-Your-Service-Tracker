import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const toastSlice = createSlice({
  name: 'toasts',
  initialState: [] as ToastMessage[],
  reducers: {
    toastAdded: {
      prepare(input: { message: string; type?: ToastMessage['type'] }) {
        return { payload: { ...input, type: input.type ?? 'info', id: nanoid() } };
      },
      reducer(state, action: PayloadAction<ToastMessage>) {
        const toast = action.payload;
        if (!toast.message.trim() || state.some((item) => item.type === toast.type && item.message === toast.message)) return;
        state.push(toast);
        if (state.length > 4) state.shift();
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { toastAdded, toastDismissed } = toastSlice.actions;
export default toastSlice.reducer;
