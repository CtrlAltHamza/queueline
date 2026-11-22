"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { INITIAL_BUSINESSES, INITIAL_SERVICES, INITIAL_HOURS, INITIAL_BOOKINGS } from "@/lib/mock-data";
import { SlotPicker } from "@/components/SlotPicker";
import { formatCents } from "@/lib/utils";
import { Sparkles, MapPin, Phone, Clock, CreditCard, ArrowRight, ShieldCheck, Check } from "lucide-react";

export default function BusinessBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const business = INITIAL_BUSINESSES.find((b) => b.slug === slug);
  if (!business) {
    notFound();
  }

  const services = INITIAL_SERVICES.filter((s) => s.business_id === business.id);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || "");
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];
  const activeHours = INITIAL_HOURS.find((h) => !h.is_closed) || { opens: "09:00", closes: "18:00" };

  const handleBookWithDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotIso || !customerName || !customerEmail) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          business_name: business.name,
          service_id: selectedService.id,
          service_name: selectedService.name,
          deposit_cents: business.deposit_cents,
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
      } else {
        // Fallback to success page
        window.location.href = `/b/${business.slug}/success?booking_id=mock-booking-${Date.now()}`;
      }
    } catch (err) {
      console.error("Booking error:", err);
      window.location.href = `/b/${business.slug}/success?booking_id=mock-booking-${Date.now()}`;
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
              <span>{business.category}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {business.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">{business.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {business.address}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {business.phone}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Open Mon-Sat: 09:00 - 18:00
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`/b/${business.slug}/queue`}
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
                      setSelectedSlotIso(""); // Reset slot when service duration changes
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
                      <span className="font-bold text-slate-900">{formatCents(svc.price_cents)}</span>
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
              depositCents={business.deposit_cents}
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
            onSubmit={handleBookWithDeposit}
            className="sticky top-24 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
          >
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
              3. Booking Details
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
                <span className="text-slate-500">Service Price:</span>
                <span className="font-medium text-slate-700">{formatCents(selectedService.price_cents)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-indigo-700">
                <span>Deposit Required Today:</span>
                <span>{formatCents(business.deposit_cents)}</span>
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
                placeholder="Jane Doe"
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
                placeholder="jane@example.com"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Phone Number (For SMS reminders)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
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
                placeholder="Any special requests or allergies..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedSlotIso || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Redirecting to Stripe..."
                    : `Pay ${formatCents(business.deposit_cents)} Deposit & Book`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure deposit via Stripe. Cancel up to 24h prior for full refund.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
