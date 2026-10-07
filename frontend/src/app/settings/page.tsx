"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type CompanySettingsForm = {
  companyName: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  email: string;
  gstin: string;
  stateName: string;
  stateCode: string;
  invoicePrefix: string;
  currentInvoiceNumber: string;
  financialYear: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  branch: string;
  ifscCode: string;
  declaration: string;
  jurisdiction: string;
  authorizedSignatoryName: string;
  termsAndConditions: string;
};

type FormField = {
  name: keyof CompanySettingsForm;
  label: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  required?: boolean;
};

type Section = {
  title: string;
  description: string;
  fields: FormField[];
};

const emptyForm: CompanySettingsForm = {
  companyName: "",
  logoUrl: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  phone: "",
  email: "",
  gstin: "",
  stateName: "",
  stateCode: "",
  invoicePrefix: "INV",
  currentInvoiceNumber: "1",
  financialYear: "2026-27",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  branch: "",
  ifscCode: "",
  declaration: "",
  jurisdiction: "",
  authorizedSignatoryName: "",
  termsAndConditions: "",
};

const sections: Section[] = [
  {
    title: "Business Information",
    description: "Company details used in invoice headers and business records.",
    fields: [
      {
        name: "companyName",
        label: "Business/Company Name",
        placeholder: "IntelliBill Traders",
        required: true,
      },
      {
        name: "logoUrl",
        label: "Business Logo URL",
        placeholder: "https://example.com/logo.png",
      },
      { name: "address", label: "Address", multiline: true },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "pinCode", label: "PIN Code", placeholder: "400001" },
      { name: "phone", label: "Phone Number", placeholder: "+91 98765 43210" },
      { name: "email", label: "Email", type: "email" },
    ],
  },
  {
    title: "GST Information",
    description: "Registration details required for GST-compliant documents.",
    fields: [
      { name: "gstin", label: "GSTIN", placeholder: "27ABCDE1234F1Z5" },
      { name: "stateName", label: "State Name" },
      { name: "stateCode", label: "State Code", placeholder: "27" },
    ],
  },
  {
    title: "Invoice Settings",
    description: "Numbering format reserved for future invoice generation.",
    fields: [
      { name: "invoicePrefix", label: "Invoice Prefix", placeholder: "INV" },
      {
        name: "currentInvoiceNumber",
        label: "Current Invoice Number",
        type: "number",
        placeholder: "1",
      },
      {
        name: "financialYear",
        label: "Financial Year",
        placeholder: "2026-27",
      },
    ],
  },
  {
    title: "Bank Details",
    description: "Payment details that can appear in invoice footers.",
    fields: [
      { name: "bankName", label: "Bank Name" },
      { name: "accountHolderName", label: "Account Holder Name" },
      { name: "accountNumber", label: "Account Number" },
      { name: "branch", label: "Branch" },
      { name: "ifscCode", label: "IFSC Code" },
    ],
  },
  {
    title: "Invoice Footer / Legal Details",
    description: "Declaration, terms, and signatory details for invoices.",
    fields: [
      { name: "declaration", label: "Declaration", multiline: true },
      { name: "jurisdiction", label: "Jurisdiction" },
      {
        name: "authorizedSignatoryName",
        label: "Authorized Signatory Name",
      },
      {
        name: "termsAndConditions",
        label: "Terms & Conditions",
        multiline: true,
      },
    ],
  },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const gstinPattern =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function normalizeSettings(settings: Partial<CompanySettingsForm> | null) {
  if (!settings) {
    return emptyForm;
  }

  return {
    ...emptyForm,
    ...settings,
    gstin: settings.gstin || "",
    currentInvoiceNumber: String(settings.currentInvoiceNumber || "1"),
  };
}

function validateForm(form: CompanySettingsForm) {
  if (!form.companyName.trim()) {
    return "Business/Company Name is required.";
  }

  if (form.gstin && !gstinPattern.test(form.gstin.trim().toUpperCase())) {
    return "Please enter a valid GSTIN.";
  }

  if (form.email && !emailPattern.test(form.email.trim())) {
    return "Please enter a valid email address.";
  }

  if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) {
    return "Please enter a valid phone number.";
  }

  if (form.pinCode && !/^[1-9][0-9]{5}$/.test(form.pinCode.trim())) {
    return "Please enter a valid 6-digit PIN code.";
  }

  if (form.stateCode && !/^[0-9]{1,2}$/.test(form.stateCode.trim())) {
    return "State code must be numeric.";
  }

  if (
    form.invoicePrefix &&
    !/^[A-Z0-9-]{1,12}$/.test(form.invoicePrefix.trim().toUpperCase())
  ) {
    return "Invoice prefix can only contain letters, numbers, and hyphens.";
  }

  const invoiceNumber = Number(form.currentInvoiceNumber);

  if (!Number.isInteger(invoiceNumber) || invoiceNumber < 1) {
    return "Current invoice number must be a positive number.";
  }

  if (
    form.financialYear &&
    !/^([0-9]{4}|[0-9]{2})-[0-9]{2}$/.test(form.financialYear.trim())
  ) {
    return "Financial year must use a format like 2026-27.";
  }

  return "";
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<CompanySettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setLoading(true);
        setError("");

        const token = getAuthToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const response = await fetch(`${API_URL}/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load company settings.");
        }

        if (!cancelled) {
          setForm(normalizeSettings(data.settings));
        }
      } catch (settingsError) {
        if (!cancelled) {
          setError(
            settingsError instanceof Error
              ? settingsError.message
              : "Failed to load company settings."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateField(name: keyof CompanySettingsForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm(form);

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token = getAuthToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          gstin: form.gstin.trim().toUpperCase(),
          invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
          currentInvoiceNumber: Number(form.currentInvoiceNumber),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save company settings.");
      }

      setForm(normalizeSettings(data.settings));
      setMessage("Company settings saved successfully.");
    } catch (settingsError) {
      setError(
        settingsError instanceof Error
          ? settingsError.message
          : "Failed to save company settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="settings-page">
        <div className="settings-loading">Loading company settings...</div>
      </main>
    );
  }

  return (
    <main className="settings-page">
      <div className="settings-shell">
        <header className="settings-header">
          <div>
            <p className="settings-eyebrow">BUSINESS SETTINGS</p>
            <h1>Company Profile</h1>
            <p>
              Store your business details once so future invoices can use the
              correct header, numbering, banking, and footer information.
            </p>
          </div>
        </header>

        {message && <div className="settings-message">{message}</div>}
        {error && <div className="settings-error">{error}</div>}

        <form className="settings-form" onSubmit={saveSettings}>
          {sections.map((section) => (
            <section className="settings-card" key={section.title}>
              <div className="settings-card-heading">
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
              </div>

              <div className="settings-grid">
                {section.fields.map((field) => (
                  <label
                    className={field.multiline ? "settings-wide-field" : ""}
                    key={field.name}
                  >
                    <span>
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>

                    {field.multiline ? (
                      <textarea
                        value={form[field.name]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          updateField(field.name, event.target.value)
                        }
                      />
                    ) : (
                      <input
                        type={field.type || "text"}
                        value={form[field.name]}
                        placeholder={field.placeholder}
                        min={field.type === "number" ? 1 : undefined}
                        onChange={(event) =>
                          updateField(field.name, event.target.value)
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}

          <div className="settings-actions">
            <button className="settings-save-button" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
