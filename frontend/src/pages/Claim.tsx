import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNphies } from "../hooks/useNphies";

interface ClaimForm {
  claimId: string;
  patientId: string;
  amount: number;
  diagnosis: string;
}

export default function Claim() {
  const { t } = useTranslation();
  const { register, handleSubmit, reset } = useForm<ClaimForm>({
    defaultValues: { claimId: "", patientId: "", amount: 0, diagnosis: "" }
  });
  const { data, error, loading, execute } = useNphies<ClaimForm>();
  const [showJson, setShowJson] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);

  const onSubmit = async (data: ClaimForm) => {
    const payload = { ...data, amount: Number(data.amount) };
    try {
      await execute({
        endpoint: "claim",
        body: payload,
        onSuccess: () => {
          setSubmittedAmount(payload.amount);
          reset();
        }
      });
    } catch (err) {
      console.error("Claim submission failed", err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">{t("claim_title")}</h1>
        <p className="text-sm text-gray-400">{t("claim_intro")}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          {t("claim_id")}
          <input
            {...register("claimId", { required: true })}
            className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2"
            placeholder={t("claim_id_placeholder") ?? ""}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          {t("patient_id")}
          <input
            {...register("patientId", { required: true })}
            className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2"
            placeholder={t("patient_id_placeholder") ?? ""}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          {t("claim_amount")}
          <input
            type="number"
            step="0.01"
            {...register("amount", { required: true, min: 0 })}
            className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2"
            placeholder="250"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          {t("claim_diagnosis")}
          <input
            {...register("diagnosis", { required: true })}
            className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2"
            placeholder={t("claim_diagnosis_placeholder") ?? ""}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-gray-900"
          disabled={loading}
        >
          {loading ? t("sending") : t("submit_claim")}
        </button>
      </form>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {data ? (
        <section className="space-y-2 rounded-lg border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-primary">{t("claim_result_title")}</h2>
            {submittedAmount ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {t("claim_amount_submitted", { amount: submittedAmount })}
              </span>
            ) : null}
            <button
              type="button"
              className="text-xs text-gray-500 underline"
              onClick={() => setShowJson((value) => !value)}
            >
              {showJson ? t("hide_raw") : t("show_raw")}
            </button>
          </div>
          <p className="text-gray-400">{t("claim_result_hint")}</p>
          {showJson ? (
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-gray-300">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
