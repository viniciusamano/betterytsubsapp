"use client";

import { useActionState } from "react";
import { importTakeoutCsv, type ImportResult } from "./actions";
import styles from "./import-form.module.css";

const initialState: ImportResult = { status: "idle" };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importTakeoutCsv,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="file">
          Arquivo subscriptions.csv
        </label>
        <input
          className={styles.input}
          type="file"
          id="file"
          name="file"
          accept=".csv,text/csv"
          required
        />
      </div>

      <button type="submit" disabled={pending} className={styles.submit}>
        {pending ? "Importando…" : "Importar"}
      </button>

      {state.status === "error" && <p className={styles.error}>{state.message}</p>}
      {state.status === "success" && (
        <p className={styles.success}>
          {state.imported} canais importados/atualizados.
          {state.sample.length > 0 &&
            ` Exemplos: ${state.sample.join(", ")}${
              state.imported > state.sample.length ? "…" : ""
            }`}
        </p>
      )}
    </form>
  );
}
