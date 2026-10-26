import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BusinessRole, BusinessState } from './types';

const initialState: BusinessState = {
  selectedBusinessId: null,
  selectedPortal: null,
};

const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {
    selectBusiness(
      state,
      action: PayloadAction<{ businessId: string; portal?: BusinessRole }>,
    ) {
      state.selectedBusinessId = action.payload.businessId;
      if (action.payload.portal) {
        state.selectedPortal = action.payload.portal;
      }
    },
    selectPortal(state, action: PayloadAction<BusinessRole>) {
      state.selectedPortal = action.payload;
    },
    clearBusinessSelection(state) {
      state.selectedBusinessId = null;
      state.selectedPortal = null;
    },
  },
});

export const { selectBusiness, selectPortal, clearBusinessSelection } = businessSlice.actions;

export default businessSlice.reducer;

export const selectBusinessState = (state: { business: BusinessState }) => state.business;
export const selectSelectedBusinessId = (state: { business: BusinessState }) =>
  state.business.selectedBusinessId;
export const selectSelectedPortal = (state: { business: BusinessState }) =>
  state.business.selectedPortal;
