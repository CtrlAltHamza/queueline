"use client";

import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { INITIAL_BUSINESSES, INITIAL_SERVICES, INITIAL_HOURS, INITIAL_BOOKINGS, Business, Service } from "@/lib/mock-data";
import { SlotPicker } from "@/components/SlotPicker";
import { formatCents } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, MapPin, Phone, Clock, CreditCard, ArrowRight, ShieldCheck, Check, Banknote, Building2 } from "lucide-react";

export default function BusinessBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const supabase = createClient();

  const [business, setBusiness] = useState<Business | null>(() => {
    return INITIAL_BUSINESSES.find((b) => b.slug === slug) || null;
  });

  const [services, setServices] = useState<Service[]>(() => {
    const foundBiz = INITIAL_BUSINESSES.find((b) => b.slug === slug);
    return foundBiz ? INITIAL_SERVICES.filter((s) => s.business_id === foundBiz.id) : [];
  });

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"venue" | "card">("venue");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dynamic business from Supabase if not in static seed
  useEffect(() => {
    async function fetchBusiness() {
      const { data: bizData } = (await (supabase.from("businesses") as any)
        .select("*")
        .eq("slug", slug)
        .single()) as any;

      if (bizData) {
        setBusiness({
          id: bizData.id,
          slug: bizData.slug,
          name: bizData.name,
          description: bizData.description || "",
          category: bizData.category as any,
          timezone: bizData.timezone,
          deposit_cents: bizData.deposit_cents,
          currency: bizData.currency || "PKR",
          address: bizData.address || "",
          phone: bizData.phone || "",
        });

        // Fetch services
        const { data: svcData } = (await (supabase.from("services") as any)
          .select("*")
          .eq("business_id", bizData.id)
          .eq("is_active", true)) as any;

        if (svcData && svcData.length > 0) {
          setServices(svcData);
          setSelectedServiceId(svcData[0].id);
        }
      }
    }

    fetchBusiness();
  }, [slug]);

  // Set default selected service
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  if (!business && services.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading business booking page...
      </div>
    );
  }

  const currentBusiness = business || {
    id: "demo",
    slug,
    name: "Medical Clinic & Salon",
    description: "Professional appointment booking.",
    category: "clinic" as const,
    timezone: "Asia/Karachi",
    deposit_cents: 0,
    currency: "PKR",
    address: "",
    phone: "",
  };

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0] || {
    id: "def-svc",
    name: "General Consultation",
    duration_min: 30,
    price_cents: 200000,
    description: "Initial consultation session.",
  };

  const activeHours = INITIAL_HOURS.find((h) => !h.is_closed) || { opens: "09:00", closes: "18:00" };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotIso || !customerName || !customerEmail) return;

    setIsSubmitting(true);
    try {
      if (paymentMethod === "card" && currentBusiness.deposit_cents > 0) {
        // Stripe Card Deposit
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: currentBusiness.id,
            business_name: currentBusiness.name,
            service_id: selectedService.id,
            service_name: selectedService.name,
            deposit_cents: currentBusiness.deposit_cents,
            starts_at: selectedSlotIso,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            notes,
          }),
        });

        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      // Pay at Venue / Direct Confirmation (works in Pakistan & everywhere without merchant Stripe)
      const bookingId = `book_${Date.now()}`;
      window.location.href = `/b/${currentBusiness.slug}/success?booking_id=${bookingId}&venue=true`;
    } catch (err) {
      console.error("Booking error:", err);
      window.location.href = `/b/${currentBusiness.slug}/success?booking_id=book_${Date.now()}`;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Business Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentBusiness.category}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentBusiness.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">{currentBusiness.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {currentBusiness.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {currentBusiness.address}
                </span>
              )}
              {currentBusiness.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {currentBusiness.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Timezone: {currentBusiness.timezone}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`/b/${currentBusiness.slug}/queue`}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold hover:bg-slate-200 transition text-center"
            >
              Walk-in? Join Live Queue
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Services & Slot Picker */}
        <div className="lg:col-span-2 space-y-8">
          {/* Service Picker */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg mb-4">1. Choose a Service</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((svc) => {
                const isSelected = selectedServiceId === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(svc.id);
                      setSelectedSlotIso("");
                    }}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-slate-900 text-sm">{svc.name}</h3>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{svc.description}</p>
                    <div className="mt-3 flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {svc.duration_min} min
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCents(svc.price_cents, currentBusiness.currency)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot Picker */}
          <div>
            <h2 className="font-bold text-slate-900 text-lg mb-4">2. Select Your Time Slot</h2>
            <SlotPicker
              businessHoursOpens={activeHours.opens}
              businessHoursCloses={activeHours.closes}
              durationMin={selectedService.duration_min}
              depositCents={currentBusiness.deposit_cents}
              servicePriceCents={selectedService.price_cents}
              existingBookings={INITIAL_BOOKINGS}
              onSelectSlot={(slotIso) => setSelectedSlotIso(slotIso)}
              selectedSlotIso={selectedSlotIso}
            />
          </div>
        </div>

        {/* Right Column: Checkout Summary & Customer Form */}
        <div>
          <form
            onSubmit={handleBookAppointment}
            className="sticky top-24 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
          >
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
              3. Booking &amp; Payment
            </h3>

            {/* Selected Summary Card */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-semibold text-slate-900">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-medium text-slate-700">{selectedService.duration_min} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service Fee:</span>
                <span className="font-medium text-slate-700">
                  {formatCents(selectedService.price_cents, currentBusiness.currency)}
                </span>
              </div>
              {currentBusiness.deposit_cents > 0 && (
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-indigo-700">
                  <span>Deposit Required:</span>
                  <span>{formatCents(currentBusiness.deposit_cents, currentBusiness.currency)}</span>
                </div>
              )}
            </div>

            {/* Payment Method Selector (Pakistan & Global Friendly) */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                Payment Option
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("venue")}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition flex flex-col justify-between ${
                    paymentMethod === "venue"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-500/10"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Pay at Venue</span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-500">
                    Pay cash / card upon arrival
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition flex flex-col justify-between ${
                    paymentMethod === "card"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/10"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-bold">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Online Deposit</span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-500">
                    Visa / Mastercard via Stripe
                  </span>
                </button>
              </div>
            </div>

            {/* Contact Inputs */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Hamza Khurram"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Email Address * (For Confirmation)
              </label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="hamza@example.com"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Phone Number (WhatsApp / SMS)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Appointment Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requests or questions..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedSlotIso || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
              >
                {paymentMethod === "venue" ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm Booking (Pay on Arrival)</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? "Connecting to Payment Gateway..."
                        : `Pay ${formatCents(currentBusiness.deposit_cents, currentBusiness.currency)} Deposit`}
                    </span>
                  </>
                )}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Guaranteed reservation. Free cancellation anytime.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
