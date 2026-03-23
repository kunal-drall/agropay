import { CreateCircleForm } from "@/components/CreateCircleForm";

export const metadata = {
  title: "Create a Circle — AGROPAY",
};

export default function CreatePage() {
  return (
    <div className="max-w-content mx-auto px-6 py-16">
      {/* Page header */}
      <div className="max-w-lg mx-auto mb-12 text-center">
        <div className="flex justify-center mb-6">
          <span className="protocol-badge">New Circle</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl gradient-text mb-4">
          Create a Circle
        </h1>
        <p className="text-earth-muted leading-relaxed">
          Set the contribution amount, member count, and frequency. You take
          position&nbsp;#1 and the first pot when all members have contributed.
        </p>
      </div>

      <CreateCircleForm />
    </div>
  );
}
