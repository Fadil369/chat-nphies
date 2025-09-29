import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNphies } from "../hooks/useNphies";

type EligibilityForm = {
  patientId: string;
  coverageId: string;
  sctCode: string;
};

type EligibilityResult = {
  status: string;
  raw: unknown;
};

export default function Eligibility() {
  const { t } = useTranslation();
  const { register, handleSubmit, reset } = useForm<EligibilityForm>({
    defaultValues: { patientId: "", coverageId: "", sctCode: "" }
  });
  const { data, error, loading, execute } = useNphies<EligibilityForm>();
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [showJson, setShowJson] = useState(false);

  const onSubmit = async (form: EligibilityForm) => {
    try {
      await execute({
        endpoint: "eligibility",
        body: form,
        onSuccess: () => {
          setTimestamp(Date.now());
          reset();
        }
      });
    } catch (err) {
      console.error("Eligibility submission failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-primary">{t("eligibility_check")}</h1>
        <p className="text-sm text-gray-400">{t("eligibility_intro")}</p>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            {t("patient_id")}
            <input
              {...register("patientId", { required: true })}
              className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2"
              placeholder={t("patient_id_placeholder") ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            {t("coverage_id")}
            <input
              {...register("coverageId", { required: true })}
              className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2"
              placeholder={t("coverage_id_placeholder") ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-300 md:col-span-2">
            {t("procedure_sct")}
            <input
              {...register("sctCode", { required: true })}
              className="rounded-md border border-gray-700 bg-gray-950 px-3 py-2"
              placeholder={t("procedure_placeholder") ?? ""}
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-gray-900"
            disabled={loading}
          >
            {loading ? t("sending") : t("check")}
          </button>
          <button
            type="button"
            className="text-xs text-gray-500 underline"
            onClick={() => setShowJson((value) => !value)}
          >
            {showJson ? t("hide_raw") : t("show_raw")}
          </button>
        </div>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {timestamp ? (
          <p className="text-xs text-gray-500">
            {t("last_checked", { time: new Date(timestamp).toLocaleTimeString() })}
          </p>
        ) : null}
      </form>
      {data ? (
        <section className="space-y-3 rounded-lg border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-primary">{t("eligibility_result_title")}</h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {t("status_success")}
            </span>
          </header>
          <p className="text-gray-400">{t("eligibility_result_hint")}</p>
          {showJson ? (
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-gray-400">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
