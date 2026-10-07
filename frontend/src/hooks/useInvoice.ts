import { useMemo, useReducer } from "react";
import { adjustInclusiveRatesToTotal, calculateInvoice, roundMoney, TaxMode } from "@/lib/invoiceMath";

export type InvoiceCustomer = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
  totalOutstanding?: number;
};

export type InvoiceProduct = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
  gstRate: number;
  hsnCode?: string;
  sku?: string;
  barcode?: string;
};

export type InvoiceItem = {
  productId: string;
  productName: string;
  sku?: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  gstRate: number;
  stock: number;
};

export type InvoiceState = {
  customerId: string;
  walkInSelected: boolean;
  walkInCustomerName: string;
  walkInCustomerPhone: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceItem[];
  paidAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "credit";
  taxMode: TaxMode;
  dirty: boolean;
};

type InvoiceAction =
  | { type: "set_customer"; customerId: string; taxMode?: TaxMode }
  | { type: "set_walk_in_mode"; selected: boolean }
  | { type: "set_walk_in_customer"; name?: string; phone?: string }
  | { type: "set_due_date"; dueDate: string }
  | { type: "set_notes"; notes: string }
  | { type: "set_payment_method"; paymentMethod: InvoiceState["paymentMethod"] }
  | { type: "set_paid_amount"; paidAmount: number }
  | { type: "add_product"; product: InvoiceProduct; quantity?: number }
  | { type: "set_quantity"; productId: string; quantity: number }
  | { type: "set_rate"; productId: string; rate: number }
  | { type: "set_total"; total: number }
  | { type: "increment_quantity"; productId: string; step: number }
  | { type: "remove_item"; productId: string }
  | { type: "reset" }
  | { type: "mark_saved"; invoiceNumber?: string };

const today = () => new Date().toISOString().slice(0, 10);

const initialState = (): InvoiceState => ({
  customerId: "",
  walkInSelected: false,
  walkInCustomerName: "",
  walkInCustomerPhone: "",
  invoiceNumber: "Auto generated",
  invoiceDate: today(),
  dueDate: today(),
  notes: "",
  items: [],
  paidAmount: 0,
  paymentMethod: "cash",
  taxMode: "intra",
  dirty: false,
});

function reducer(state: InvoiceState, action: InvoiceAction): InvoiceState {
  switch (action.type) {
    case "set_customer":
      return {
        ...state,
        customerId: action.customerId,
        walkInSelected: false,
        walkInCustomerName: "",
        walkInCustomerPhone: "",
        taxMode: action.taxMode || state.taxMode,
        dirty: true,
      };

    case "set_walk_in_mode":
      return {
        ...state,
        customerId: action.selected ? "" : state.customerId,
        walkInSelected: action.selected,
        walkInCustomerName: action.selected ? state.walkInCustomerName : "",
        walkInCustomerPhone: action.selected ? state.walkInCustomerPhone : "",
        dirty: true,
      };

    case "set_walk_in_customer":
      return {
        ...state,
        customerId: "",
        walkInSelected: true,
        walkInCustomerName: action.name ?? state.walkInCustomerName,
        walkInCustomerPhone: action.phone ?? state.walkInCustomerPhone,
        dirty: true,
      };

    case "set_due_date":
      return { ...state, dueDate: action.dueDate, dirty: true };

    case "set_notes":
      return { ...state, notes: action.notes, dirty: true };

    case "set_payment_method": {
      return {
        ...state,
        paymentMethod: action.paymentMethod,
        dirty: true,
      };
    }

    case "set_paid_amount":
      return {
        ...state,
        paidAmount: Math.max(Number(action.paidAmount) || 0, 0),
        dirty: true,
      };

    case "add_product": {
      const quantity = Math.max(Number(action.quantity) || 1, 1);
      const existing = state.items.find(
        (item) => item.productId === action.product._id
      );

      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === action.product._id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
          dirty: true,
        };
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            productId: action.product._id,
            productName: action.product.name,
            sku: action.product.sku,
            hsnCode: action.product.hsnCode || "",
            quantity,
            rate: Number(action.product.price) || 0,
            gstRate: Number(action.product.gstRate) || 0,
            stock: Number(action.product.stock) || 0,
          },
        ],
        dirty: true,
      };
    }

    case "set_quantity":
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? { ...item, quantity: Math.max(Number(action.quantity) || 0, 0) }
            : item
        ),
        dirty: true,
      };

    case "set_rate":
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? { ...item, rate: roundMoney(Math.max(Number(action.rate) || 0, 0)) }
            : item
        ),
        dirty: true,
      };

    case "set_total":
      return {
        ...state,
        items: adjustInclusiveRatesToTotal(
          state.items,
          Math.max(Number(action.total) || 0, 0)
        ),
        dirty: true,
      };

    case "increment_quantity":
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? { ...item, quantity: Math.max(item.quantity + action.step, 0) }
            : item
        ),
        dirty: true,
      };

    case "remove_item":
      return {
        ...state,
        items: state.items.filter((item) => item.productId !== action.productId),
        dirty: true,
      };

    case "mark_saved":
      return {
        ...state,
        invoiceNumber: action.invoiceNumber || state.invoiceNumber,
        dirty: false,
      };

    case "reset":
      return initialState();

    default:
      return state;
  }
}

export function useInvoice() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const calculation = useMemo(
    () =>
      calculateInvoice(state.items, {
        taxMode: state.taxMode,
        amountReceived: state.paidAmount,
      }),
    [state.items, state.paidAmount, state.taxMode]
  );

  return { state, dispatch, calculation };
}
