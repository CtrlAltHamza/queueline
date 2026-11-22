"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Globe, Clock, DollarSign, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function RegisterBusinessPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("clinic");
  const [country, setCountry] = useState("PK");
  const [currency, setCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [depositAmount, setDepositAmount] = useState("500");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from business name
  const handleNameChange = (val: string) => {
    setBusinessName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generated);
  };

  const handleCountryChange = (c: string) => {
    setCountry(c);
    if (c === "PK") {
      setCurrency("PKR");
      setTimezone("Asia/Karachi");
      setDepositAmount("500");
    } else if (c === "US") {
      setCurrency("USD");
      setTimezone("America/New_York");
      setDepositAmount("25");
    } else if (c === "GB") {
      setCurrency("GBP");
      setTimezone("Europe/London");
      setDepositAmount("20");
    } else if (c === "AE") {
      setCurrency("AED");
      setTimezone("Asia/Dubai");
      setDepositAmount("50");
    } else if (c === "EU") {
      setCurrency("EUR");
      setTimezone("Europe/Paris");
      setDepositAmount("25");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          slug,
          category,
          country,
          currency,
          timezone,
          deposit_cents: Math.round(Number(depositAmount) * 100),
          address,
          phone,
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_password: ownerPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register business");
      }

      // Store active business info in localStorage for seamless instant portal access
      localStorage.setItem("active_business_slug", slug);
      localStorage.setItem("active_business_name", businessName);
      localStorage.setItem("active_business_currency", currency);

      // Redirect directly to the owner portal
      router.push(`/owner?registered=true&slug=${slug}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-3">
          <Building2 className="w-3.5 h-3.5" />
          <span>Multi-Tenant Onboarding</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Register Your Business on QueueLine
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
          Set up smart slot booking and live walk-in queues for your clinic, salon, hospital, dental office, or studio anywhere in the world.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Business Profile */}
          <div>
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>1. Business Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Al-Shifa Skin Clinic"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Custom Booking URL Slug *
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 text-slate-500">
                  <span className="text-xs text-slate-400 mr-1">/b/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="alshifa-clinic"
                    className="w-full bg-transparent text-slate-900 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Industry / Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="clinic">Medical &amp; Aesthetic Clinic</option>
                  <option value="dental">Dental Practice</option>
                  <option value="salon">Hair Salon &amp; Barbershop</option>
                  <option value="spa">Spa &amp; Wellness Studio</option>
                  <option value="consulting">Professional Consulting / Office</option>
                  <option value="other">Other Appointment-based Business</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Country &amp; Region *
                </label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="PK">Pakistan 🇵🇰 (PKR, Asia/Karachi)</option>
                  <option value="AE">United Arab Emirates 🇦🇪 (AED, Dubai)</option>
                  <option value="US">United States 🇺🇸 (USD)</option>
                  <option value="GB">United Kingdom 🇬🇧 (GBP)</option>
                  <option value="EU">European Union 🇪🇺 (EUR)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="PKR">PKR (Pakistani Rupee - Rs.)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                  <option value="GBP">GBP (British Pound - £)</option>
                  <option value="EUR">EUR (Euro - €)</option>
                  <option value="AED">AED (Emirati Dirham)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Required Reservation Deposit
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="500"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold">
                    {currency}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Set to 0 if no deposit is required to book.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Business Address / City
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. DHA Phase 5, Lahore, Pakistan"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Business WhatsApp / Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Owner Account */}
          <div className="pt-4">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>2. Owner Account Credentials</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Dr. Hamza Khurram"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="hamza@example.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                Sign in here
              </Link>
            </p>

            <button
              type="submit"
              disabled={loading || !businessName || !slug || !ownerEmail}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              <span>{loading ? "Creating Business..." : "Launch My Business Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
